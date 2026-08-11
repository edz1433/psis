<?php

namespace App\Http\Controllers;

use App\Http\Requests\Hotel\HotelBookingRequest;
use App\Http\Requests\Hotel\HotelBuildingRequest;
use App\Http\Requests\Hotel\HotelFacilityRequest;
use App\Http\Requests\Hotel\HotelRoomPackageRequest;
use App\Http\Requests\Hotel\HotelRoomRequest;
use App\Models\HotelAmenity;
use App\Models\HotelBooking;
use App\Models\HotelBuilding;
use App\Models\HotelBuildingImage;
use App\Models\HotelFacility;
use App\Models\HotelFacilityImage;
use App\Models\HotelRoom;
use App\Models\HotelRoomImage;
use App\Models\HotelRoomPackage;
use App\Services\HotelBookingPriceCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class HotelBookingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('HotelBookings/Index', [
            'title' => 'Hotel Booking Management',
            'buildings' => HotelBuilding::with(['images', 'rooms'])->withCount('rooms')->latest()->get(),
            'facilities' => HotelFacility::with(['images', 'packages'])->latest()->get(),
            'rooms' => HotelRoom::with(['building', 'images', 'pricing', 'packages', 'amenities'])->latest()->get(),
            'packages' => HotelRoomPackage::with(['room.building', 'facility'])->latest()->get(),
            'bookings' => HotelBooking::with(['room.building', 'facility', 'package', 'charges'])->latest('check_in_at')->get(),
            'amenities' => HotelAmenity::orderBy('name')->get(),
        ]);
    }

    public function storeBuilding(HotelBuildingRequest $request): RedirectResponse
    {
        $building = HotelBuilding::create($request->safe()->except('images'));
        $this->storeBuildingImages($building, $request);

        return back()->with('message', ['type' => 'success', 'text' => 'Building created successfully.']);
    }

    public function updateBuilding(HotelBuildingRequest $request, HotelBuilding $hotelBuilding): RedirectResponse
    {
        $hotelBuilding->update($request->safe()->except('images'));
        $this->storeBuildingImages($hotelBuilding, $request);

        return back()->with('message', ['type' => 'success', 'text' => 'Building updated successfully.']);
    }

    public function destroyBuilding(HotelBuilding $hotelBuilding): RedirectResponse
    {
        if ($hotelBuilding->rooms()->exists()) {
            return back()->withErrors(['building' => 'Remove rooms before deleting this building.']);
        }

        $hotelBuilding->images->each(fn (HotelBuildingImage $image) => Storage::disk('public')->delete($image->path));
        $hotelBuilding->delete();

        return back()->with('message', ['type' => 'success', 'text' => 'Building deleted successfully.']);
    }

    public function storeRoom(HotelRoomRequest $request): RedirectResponse
    {
        $room = DB::transaction(function () use ($request) {
            $room = HotelRoom::create($request->safe()->except(['images', 'amenity_ids', 'pricing']));
            $room->amenities()->sync($request->input('amenity_ids', []));
            $room->pricing()->create($this->pricingData($request));
            $this->storeRoomImages($room, $request);

            return $room;
        });

        return back()->with('message', ['type' => 'success', 'text' => "Room {$room->name} created successfully."]);
    }

    public function updateRoom(HotelRoomRequest $request, HotelRoom $hotelRoom): RedirectResponse
    {
        DB::transaction(function () use ($request, $hotelRoom) {
            $hotelRoom->update($request->safe()->except(['images', 'amenity_ids', 'pricing']));
            $hotelRoom->amenities()->sync($request->input('amenity_ids', []));
            $hotelRoom->pricing()->updateOrCreate([], $this->pricingData($request));
            $this->storeRoomImages($hotelRoom, $request);
        });

        return back()->with('message', ['type' => 'success', 'text' => 'Room updated successfully.']);
    }

    public function destroyRoom(HotelRoom $hotelRoom): RedirectResponse
    {
        if ($hotelRoom->bookings()->whereNotIn('booking_status', ['cancelled', 'checked-out', 'no-show'])->exists()) {
            return back()->withErrors(['room' => 'This room still has active bookings.']);
        }

        $hotelRoom->images->each(fn (HotelRoomImage $image) => Storage::disk('public')->delete($image->path));
        $hotelRoom->delete();

        return back()->with('message', ['type' => 'success', 'text' => 'Room deleted successfully.']);
    }

    public function storeFacility(HotelFacilityRequest $request): RedirectResponse
    {
        $facility = HotelFacility::create($this->facilityData($request));
        $this->storeFacilityImages($facility, $request);

        return back()->with('message', ['type' => 'success', 'text' => "Facility {$facility->name} created successfully."]);
    }

    public function updateFacility(HotelFacilityRequest $request, HotelFacility $hotelFacility): RedirectResponse
    {
        $hotelFacility->update($this->facilityData($request));
        $this->storeFacilityImages($hotelFacility, $request);

        return back()->with('message', ['type' => 'success', 'text' => 'Facility updated successfully.']);
    }

    public function destroyFacility(HotelFacility $hotelFacility): RedirectResponse
    {
        if ($hotelFacility->bookings()->whereNotIn('booking_status', ['cancelled', 'checked-out', 'no-show'])->exists()) {
            return back()->withErrors(['facility' => 'This facility still has active bookings.']);
        }

        $hotelFacility->images->each(fn (HotelFacilityImage $image) => Storage::disk('public')->delete($image->path));
        $hotelFacility->delete();

        return back()->with('message', ['type' => 'success', 'text' => 'Facility deleted successfully.']);
    }

    public function storeAmenity(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:hotel_amenities,name'],
            'description' => ['nullable', 'string', 'max:500'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        HotelAmenity::create($validated);

        return back()->with('message', ['type' => 'success', 'text' => 'Amenity created successfully.']);
    }

    public function updateAmenity(Request $request, HotelAmenity $hotelAmenity): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('hotel_amenities', 'name')->ignore($hotelAmenity)],
            'description' => ['nullable', 'string', 'max:500'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $hotelAmenity->update($validated);

        return back()->with('message', ['type' => 'success', 'text' => 'Amenity updated successfully.']);
    }

    public function destroyAmenity(HotelAmenity $hotelAmenity): RedirectResponse
    {
        $hotelAmenity->delete();

        return back()->with('message', ['type' => 'success', 'text' => 'Amenity deleted successfully.']);
    }

    public function storePackage(HotelRoomPackageRequest $request): RedirectResponse
    {
        HotelRoomPackage::create($request->validated());

        return back()->with('message', ['type' => 'success', 'text' => 'Package created successfully.']);
    }

    public function updatePackage(HotelRoomPackageRequest $request, HotelRoomPackage $hotelRoomPackage): RedirectResponse
    {
        $hotelRoomPackage->update($request->validated());

        return back()->with('message', ['type' => 'success', 'text' => 'Package updated successfully.']);
    }

    public function destroyPackage(HotelRoomPackage $hotelRoomPackage): RedirectResponse
    {
        if ($hotelRoomPackage->bookings()->exists()) {
            return back()->withErrors(['package' => 'This package is already used by bookings. Set it inactive instead.']);
        }

        $hotelRoomPackage->delete();

        return back()->with('message', ['type' => 'success', 'text' => 'Package deleted successfully.']);
    }

    public function storeBooking(HotelBookingRequest $request, HotelBookingPriceCalculator $calculator): RedirectResponse
    {
        DB::transaction(function () use ($request, $calculator) {
            $validated = $request->validated();
            $this->assertNoActiveBookingConflict($validated);
            $calculated = $calculator->calculate($validated);
            unset($validated['booking_target_type']);
            $booking = HotelBooking::create([...$validated, ...collect($calculated)->only(['total_amount', 'deposit_amount'])->all()]);
            $booking->charges()->createMany($calculated['charges']);
        });

        return back()->with('message', ['type' => 'success', 'text' => 'Booking created successfully.']);
    }

    public function updateBooking(HotelBookingRequest $request, HotelBooking $hotelBooking, HotelBookingPriceCalculator $calculator): RedirectResponse
    {
        DB::transaction(function () use ($request, $hotelBooking, $calculator) {
            $validated = $request->validated();
            $this->assertNoActiveBookingConflict($validated, $hotelBooking->id);
            $calculated = $calculator->calculate($validated);
            unset($validated['booking_target_type']);
            $hotelBooking->update([...$validated, ...collect($calculated)->only(['total_amount', 'deposit_amount'])->all()]);
            $hotelBooking->charges()->delete();
            $hotelBooking->charges()->createMany($calculated['charges']);
        });

        return back()->with('message', ['type' => 'success', 'text' => 'Booking updated successfully.']);
    }

    public function destroyBooking(HotelBooking $hotelBooking): RedirectResponse
    {
        $hotelBooking->delete();

        return back()->with('message', ['type' => 'success', 'text' => 'Booking deleted successfully.']);
    }

    public function calculate(Request $request, HotelBookingPriceCalculator $calculator): JsonResponse
    {
        $validated = $request->validate([
            'booking_target_type' => ['required', Rule::in(['room', 'facility'])],
            'hotel_room_id' => ['nullable', 'required_if:booking_target_type,room', 'exists:hotel_rooms,id'],
            'hotel_facility_id' => ['nullable', 'required_if:booking_target_type,facility', 'exists:hotel_facilities,id'],
            'hotel_room_package_id' => ['nullable', 'exists:hotel_room_packages,id'],
            'check_in_at' => ['required', 'date'],
            'check_out_at' => ['required', 'date', 'after:check_in_at'],
            'adults' => ['required', 'integer', 'min:1'],
            'children' => ['required', 'integer', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'additional_fees' => ['nullable', 'numeric', 'min:0'],
            'deposit_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $package = ! empty($validated['hotel_room_package_id'])
            ? HotelRoomPackage::find($validated['hotel_room_package_id'])
            : null;

        if ($package && ! $this->packageMatchesTarget($package, $validated)) {
            abort(422, 'This package is not available for the selected room or facility.');
        }

        return response()->json($calculator->calculate($validated));
    }

    public function deleteBuildingImage(HotelBuildingImage $hotelBuildingImage): RedirectResponse
    {
        Storage::disk('public')->delete($hotelBuildingImage->path);
        $hotelBuildingImage->delete();

        return back();
    }

    public function deleteRoomImage(HotelRoomImage $hotelRoomImage): RedirectResponse
    {
        Storage::disk('public')->delete($hotelRoomImage->path);
        $hotelRoomImage->delete();

        return back();
    }

    public function deleteFacilityImage(HotelFacilityImage $hotelFacilityImage): RedirectResponse
    {
        Storage::disk('public')->delete($hotelFacilityImage->path);
        $hotelFacilityImage->delete();

        return back();
    }

    public function primaryBuildingImage(HotelBuildingImage $hotelBuildingImage): RedirectResponse
    {
        $hotelBuildingImage->building->images()->update(['is_primary' => false]);
        $hotelBuildingImage->update(['is_primary' => true]);

        return back();
    }

    public function primaryRoomImage(HotelRoomImage $hotelRoomImage): RedirectResponse
    {
        $hotelRoomImage->room->images()->update(['is_primary' => false]);
        $hotelRoomImage->update(['is_primary' => true]);

        return back();
    }

    public function primaryFacilityImage(HotelFacilityImage $hotelFacilityImage): RedirectResponse
    {
        $hotelFacilityImage->facility->images()->update(['is_primary' => false]);
        $hotelFacilityImage->update(['is_primary' => true]);

        return back();
    }

    public function reorderBuildingImages(Request $request, HotelBuilding $hotelBuilding): RedirectResponse
    {
        $this->reorderImages($request, $hotelBuilding->images());

        return back();
    }

    public function reorderRoomImages(Request $request, HotelRoom $hotelRoom): RedirectResponse
    {
        $this->reorderImages($request, $hotelRoom->images());

        return back();
    }

    public function reorderFacilityImages(Request $request, HotelFacility $hotelFacility): RedirectResponse
    {
        $this->reorderImages($request, $hotelFacility->images());

        return back();
    }

    private function pricingData(HotelRoomRequest $request): array
    {
        $pricing = $request->input('pricing', []);

        return [
            'base_price' => $pricing['base_price'] ?? 0,
            'price_type' => $pricing['price_type'] ?? 'per_night',
            'weekend_price' => $pricing['weekend_price'] ?? null,
            'holiday_price' => $pricing['holiday_price'] ?? null,
            'extra_adult_price' => $pricing['extra_adult_price'] ?? 0,
            'extra_child_price' => $pricing['extra_child_price'] ?? 0,
            'child_age_rule' => $pricing['child_age_rule'] ?? null,
            'security_deposit' => $pricing['security_deposit'] ?? 0,
            'cleaning_fee' => $pricing['cleaning_fee'] ?? 0,
            'other_fees' => $pricing['other_fees'] ?? [],
        ];
    }

    private function facilityData(HotelFacilityRequest $request): array
    {
        $data = $request->safe()->except('images');

        foreach (['base_price', 'extra_adult_price', 'extra_child_price', 'security_deposit', 'cleaning_fee'] as $field) {
            $data[$field] = $data[$field] ?? 0;
        }

        return $data;
    }

    private function storeBuildingImages(HotelBuilding $building, Request $request): void
    {
        foreach ($request->file('images', []) as $image) {
            $building->images()->create([
                'path' => $image->store('hotel/buildings', 'public'),
                'original_name' => $image->getClientOriginalName(),
                'sort_order' => $building->images()->max('sort_order') + 1,
                'is_primary' => ! $building->images()->exists(),
            ]);
        }
    }

    private function storeRoomImages(HotelRoom $room, Request $request): void
    {
        foreach ($request->file('images', []) as $image) {
            $room->images()->create([
                'path' => $image->store('hotel/rooms', 'public'),
                'original_name' => $image->getClientOriginalName(),
                'sort_order' => $room->images()->max('sort_order') + 1,
                'is_primary' => ! $room->images()->exists(),
            ]);
        }
    }

    private function storeFacilityImages(HotelFacility $facility, Request $request): void
    {
        foreach ($request->file('images', []) as $image) {
            $facility->images()->create([
                'path' => $image->store('hotel/facilities', 'public'),
                'original_name' => $image->getClientOriginalName(),
                'sort_order' => $facility->images()->max('sort_order') + 1,
                'is_primary' => ! $facility->images()->exists(),
            ]);
        }
    }

    private function reorderImages(Request $request, $images): void
    {
        $validated = $request->validate([
            'image_ids' => ['required', 'array'],
            'image_ids.*' => ['integer'],
        ]);

        foreach ($validated['image_ids'] as $index => $id) {
            $images->whereKey($id)->update(['sort_order' => $index]);
        }
    }

    private function packageMatchesTarget(HotelRoomPackage $package, array $data): bool
    {
        if (($data['booking_target_type'] ?? 'room') === 'facility') {
            return ($package->hotel_room_id === null && $package->hotel_facility_id === null)
                || (int) $package->hotel_facility_id === (int) ($data['hotel_facility_id'] ?? 0);
        }

        return ($package->hotel_room_id === null && $package->hotel_facility_id === null)
            || (int) $package->hotel_room_id === (int) ($data['hotel_room_id'] ?? 0);
    }

    private function assertNoActiveBookingConflict(array $data, ?int $currentId = null): void
    {
        if (! in_array($data['booking_status'] ?? null, ['pending', 'confirmed', 'checked-in'], true)) {
            return;
        }

        $isFacility = ($data['booking_target_type'] ?? 'room') === 'facility';
        $label = $isFacility ? 'facility' : 'room';

        $conflict = HotelBooking::query()
            ->when($isFacility, fn ($query) => $query->where('hotel_facility_id', $data['hotel_facility_id']))
            ->when(! $isFacility, fn ($query) => $query->where('hotel_room_id', $data['hotel_room_id']))
            ->when($currentId, fn ($query) => $query->whereKeyNot($currentId))
            ->blocking()
            ->overlapping($data['check_in_at'], $data['check_out_at'])
            ->lockForUpdate()
            ->exists();

        if ($conflict) {
            throw ValidationException::withMessages([
                'check_in_at' => "This {$label} already has a pending, confirmed, or checked-in booking in the selected date range.",
            ]);
        }
    }
}
