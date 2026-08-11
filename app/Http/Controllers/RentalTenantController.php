<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\RentalProperty;
use App\Models\RentalTenant;
use App\Models\RentalUnit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RentalTenantController extends Controller
{
    public function index(): Response
    {
        $tenants = RentalTenant::query()
            ->with(['property:id,name,type,address,has_rooms_units', 'roomUnit:id,property_id,name,floor_level'])
            ->withCount('payments')
            ->latest()
            ->get();

        $properties = RentalProperty::query()
            ->with(['units' => fn ($query) => $query->withCount('activeTenants')->orderBy('name')])
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'has_rooms_units', 'address', 'monthly_rate', 'status']);

        return Inertia::render('Rentals/Tenants/Index', [
            'tenants' => $tenants,
            'properties' => $properties,
            'title' => 'Tenants & Contracts',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:rental_properties,id',
            'room_unit_id' => 'nullable|exists:rental_units,id',
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'nullable|email|max:255',
            'phone' => 'required|string|max:20',
            'national_id' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'occupation' => 'nullable|string|max:150',
            'emergency_contact_name' => 'nullable|string|max:150',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'monthly_rent' => 'required|numeric|min:0',
            'status' => ['required', Rule::in(['active', 'ended', 'evicted'])],
            'notes' => 'nullable|string|max:2000',
        ], [
            'property_id.required' => 'Please select a property.',
            'property_id.exists' => 'Selected property does not exist.',
            'first_name.required' => 'First name is required.',
            'last_name.required' => 'Last name is required.',
            'phone.required' => 'Phone number is required.',
            'monthly_rent.required' => 'Monthly rent is required.',
        ]);

        $validated['created_by'] = auth()->id();
        $this->normalizeRoomUnitAssignment($validated);

        $tenant = RentalTenant::create($validated);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'rental_tenant_created',
            'subject_type' => RentalTenant::class,
            'subject_id' => $tenant->id,
            'properties' => [
                'tenant_name' => $tenant->full_name,
                'property_id' => $tenant->property_id,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return back()->with('message', [
            'type' => 'success',
            'text' => "Tenant \"{$tenant->full_name}\" added successfully.",
        ]);
    }

    public function update(Request $request, RentalTenant $rentalTenant): RedirectResponse
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:rental_properties,id',
            'room_unit_id' => 'nullable|exists:rental_units,id',
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'nullable|email|max:255',
            'phone' => 'required|string|max:20',
            'national_id' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'occupation' => 'nullable|string|max:150',
            'emergency_contact_name' => 'nullable|string|max:150',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'monthly_rent' => 'required|numeric|min:0',
            'status' => ['required', Rule::in(['active', 'ended', 'evicted'])],
            'notes' => 'nullable|string|max:2000',
        ]);

        $this->normalizeRoomUnitAssignment($validated, $rentalTenant);

        $oldData = $rentalTenant->only(['first_name', 'last_name', 'status', 'monthly_rent', 'property_id', 'room_unit_id']);
        $rentalTenant->update($validated);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'rental_tenant_updated',
            'subject_type' => RentalTenant::class,
            'subject_id' => $rentalTenant->id,
            'properties' => [
                'old_data' => $oldData,
                'tenant_name' => $rentalTenant->full_name,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return back()->with('message', [
            'type' => 'success',
            'text' => "Tenant \"{$rentalTenant->full_name}\" updated successfully.",
        ]);
    }

    public function destroy(Request $request, RentalTenant $rentalTenant): RedirectResponse
    {
        $name = $rentalTenant->full_name;

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'rental_tenant_deleted',
            'subject_type' => RentalTenant::class,
            'subject_id' => $rentalTenant->id,
            'properties' => [
                'deleted_tenant' => $name,
                'property_id' => $rentalTenant->property_id,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        $rentalTenant->delete();

        return back()->with('message', [
            'type' => 'success',
            'text' => "Tenant \"{$name}\" removed successfully.",
        ]);
    }

    private function normalizeRoomUnitAssignment(array &$validated, ?RentalTenant $tenant = null): void
    {
        $property = RentalProperty::findOrFail($validated['property_id']);

        if (! $property->has_rooms_units) {
            $validated['room_unit_id'] = null;

            return;
        }

        if (empty($validated['room_unit_id'])) {
            throw ValidationException::withMessages([
                'room_unit_id' => 'Please select a room/unit for this property.',
            ]);
        }

        $unit = RentalUnit::where('property_id', $property->id)->find($validated['room_unit_id']);

        if (! $unit) {
            throw ValidationException::withMessages([
                'room_unit_id' => 'Selected room/unit does not belong to the selected property.',
            ]);
        }

        if ($unit->status === 'reserved') {
            throw ValidationException::withMessages([
                'room_unit_id' => 'Selected room/unit is not available for tenant assignment.',
            ]);
        }

        $activeTenantCount = $unit->activeTenants()
            ->when($tenant, fn ($query) => $query->whereKeyNot($tenant->id))
            ->count();

        if (($validated['status'] ?? 'active') === 'active' && $activeTenantCount >= $unit->capacity) {
            throw ValidationException::withMessages([
                'room_unit_id' => 'Selected room/unit has reached its capacity.',
            ]);
        }
    }
}
