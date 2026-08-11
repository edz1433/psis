<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\RentalProperty;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RentalPropertyController extends Controller
{
    public function index(): Response
    {
        $properties = RentalProperty::query()
            ->with(['units' => fn ($query) => $query->withCount('activeTenants')->orderBy('name')])
            ->withCount(['tenants', 'activeTenants', 'units'])
            ->latest()
            ->get();

        return Inertia::render('Rentals/Properties/Index', [
            'properties' => $properties,
            'title' => 'Properties / Units',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => ['required', Rule::in($this->propertyTypes())],
            'has_rooms_units' => 'required|boolean',
            'address' => 'required|string|max:500',
            'description' => 'nullable|string|max:2000',
            'monthly_rate' => 'nullable|numeric|min:0',
            'floor_area' => 'nullable|numeric|min:0',
            'total_units' => 'nullable|integer|min:1',
            'status' => ['required', Rule::in(['available', 'occupied', 'reserved'])],
            'amenities' => 'nullable|array',
            'amenities.*' => 'string|max:100',
            'notes' => 'nullable|string|max:2000',
        ], [
            'name.required' => 'Property name is required.',
            'type.required' => 'Please select a property type.',
            'address.required' => 'Address is required.',
            'monthly_rate.min' => 'Monthly rate cannot be negative.',
            'total_units.min' => 'Total units must be at least 1.',
        ]);

        $validated['monthly_rate'] = $validated['monthly_rate'] ?? 0;
        $validated['total_units'] = $validated['has_rooms_units'] ? ($validated['total_units'] ?? 1) : 1;

        $property = RentalProperty::create($validated);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'rental_property_created',
            'subject_type' => RentalProperty::class,
            'subject_id' => $property->id,
            'properties' => [
                'name' => $property->name,
                'type' => $property->type,
                'address' => $property->address,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return back()->with('message', [
            'type' => 'success',
            'text' => "Property \"{$property->name}\" created successfully.",
        ]);
    }

    public function update(Request $request, RentalProperty $rentalProperty): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => ['required', Rule::in($this->propertyTypes())],
            'has_rooms_units' => 'required|boolean',
            'address' => 'required|string|max:500',
            'description' => 'nullable|string|max:2000',
            'monthly_rate' => 'nullable|numeric|min:0',
            'floor_area' => 'nullable|numeric|min:0',
            'total_units' => 'nullable|integer|min:1',
            'status' => ['required', Rule::in(['available', 'occupied', 'reserved'])],
            'amenities' => 'nullable|array',
            'amenities.*' => 'string|max:100',
            'notes' => 'nullable|string|max:2000',
        ]);

        if (! $validated['has_rooms_units'] && $rentalProperty->units()->exists()) {
            throw ValidationException::withMessages([
                'has_rooms_units' => 'Remove existing rooms/units before changing this property to direct tenant assignment.',
            ]);
        }

        $validated['monthly_rate'] = $validated['monthly_rate'] ?? 0;
        $validated['total_units'] = $validated['has_rooms_units'] ? ($validated['total_units'] ?? 1) : 1;

        $oldData = $rentalProperty->only(['name', 'type', 'address', 'monthly_rate', 'status']);
        $rentalProperty->update($validated);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'rental_property_updated',
            'subject_type' => RentalProperty::class,
            'subject_id' => $rentalProperty->id,
            'properties' => [
                'old_data' => $oldData,
                'new_data' => $rentalProperty->only(['name', 'type', 'address', 'monthly_rate', 'status']),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return back()->with('message', [
            'type' => 'success',
            'text' => "Property \"{$rentalProperty->name}\" updated successfully.",
        ]);
    }

    public function destroy(Request $request, RentalProperty $rentalProperty): RedirectResponse
    {
        if ($rentalProperty->activeTenants()->exists()) {
            throw ValidationException::withMessages([
                'error' => 'Cannot delete this property — it still has active tenants.',
            ]);
        }

        $name = $rentalProperty->name;

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'rental_property_deleted',
            'subject_type' => RentalProperty::class,
            'subject_id' => $rentalProperty->id,
            'properties' => [
                'deleted_property' => $name,
                'type' => $rentalProperty->type,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        $rentalProperty->delete();

        return back()->with('message', [
            'type' => 'success',
            'text' => "Property \"{$name}\" deleted successfully.",
        ]);
    }

    private function propertyTypes(): array
    {
        return [
            'dormitory',
            'apartment_rental',
            'boarding_house',
            'commercial_space',
            'stall',
            'office_space',
            'warehouse',
            'house',
            'other',
        ];
    }
}
