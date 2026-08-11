<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\RentalProperty;
use App\Models\RentalUnit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RentalUnitController extends Controller
{
    public function store(Request $request, RentalProperty $rentalProperty): RedirectResponse
    {
        $this->ensurePropertySupportsUnits($rentalProperty);

        $validated = $this->validateUnit($request, $rentalProperty);
        $unit = $rentalProperty->units()->create($validated);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'rental_unit_created',
            'subject_type' => RentalUnit::class,
            'subject_id' => $unit->id,
            'properties' => [
                'property_id' => $rentalProperty->id,
                'unit_name' => $unit->name,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return back()->with('message', [
            'type' => 'success',
            'text' => "Room/unit \"{$unit->name}\" created successfully.",
        ]);
    }

    public function update(Request $request, RentalProperty $rentalProperty, RentalUnit $rentalUnit): RedirectResponse
    {
        $this->ensureUnitBelongsToProperty($rentalProperty, $rentalUnit);
        $this->ensurePropertySupportsUnits($rentalProperty);

        $validated = $this->validateUnit($request, $rentalProperty, $rentalUnit);
        $rentalUnit->update($validated);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'rental_unit_updated',
            'subject_type' => RentalUnit::class,
            'subject_id' => $rentalUnit->id,
            'properties' => [
                'property_id' => $rentalProperty->id,
                'unit_name' => $rentalUnit->name,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return back()->with('message', [
            'type' => 'success',
            'text' => "Room/unit \"{$rentalUnit->name}\" updated successfully.",
        ]);
    }

    public function destroy(Request $request, RentalProperty $rentalProperty, RentalUnit $rentalUnit): RedirectResponse
    {
        $this->ensureUnitBelongsToProperty($rentalProperty, $rentalUnit);

        if ($rentalUnit->activeTenants()->exists()) {
            throw ValidationException::withMessages([
                'error' => 'Cannot delete this room/unit because it still has active tenants.',
            ]);
        }

        $name = $rentalUnit->name;

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'rental_unit_deleted',
            'subject_type' => RentalUnit::class,
            'subject_id' => $rentalUnit->id,
            'properties' => [
                'property_id' => $rentalProperty->id,
                'unit_name' => $name,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        $rentalUnit->delete();

        return back()->with('message', [
            'type' => 'success',
            'text' => "Room/unit \"{$name}\" deleted successfully.",
        ]);
    }

    private function validateUnit(Request $request, RentalProperty $property, ?RentalUnit $unit = null): array
    {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('rental_units', 'name')
                    ->where('property_id', $property->id)
                    ->ignore($unit?->id),
            ],
            'floor_level' => 'nullable|string|max:100',
            'capacity' => 'required|integer|min:1',
            'status' => ['required', Rule::in(['available', 'occupied', 'reserved'])],
            'notes' => 'nullable|string|max:2000',
        ]);
    }

    private function ensurePropertySupportsUnits(RentalProperty $property): void
    {
        if (! $property->has_rooms_units) {
            throw ValidationException::withMessages([
                'property_id' => 'This property is configured for direct tenant assignment and cannot have rooms/units.',
            ]);
        }
    }

    private function ensureUnitBelongsToProperty(RentalProperty $property, RentalUnit $unit): void
    {
        if ($unit->property_id !== $property->id) {
            abort(404);
        }
    }
}
