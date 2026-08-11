<?php

namespace Tests\Feature;

use App\Models\HotelBooking;
use App\Models\HotelBuilding;
use App\Models\HotelFacility;
use App\Models\HotelRoom;
use App\Models\HotelRoomPackage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HotelBookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_room_booking_rejects_facility_package(): void
    {
        $room = $this->room();
        $facility = HotelFacility::create([
            'name' => 'Main Pool',
            'facility_type' => 'pool',
            'max_adult_capacity' => 20,
            'max_child_capacity' => 20,
            'base_capacity' => 10,
            'status' => 'available',
            'base_price' => 1000,
            'price_type' => 'per_day',
        ]);
        $package = HotelRoomPackage::create([
            'hotel_facility_id' => $facility->id,
            'name' => 'Pool Day Use',
            'included_adults' => 10,
            'included_children' => 10,
            'duration_value' => 1,
            'duration_unit' => 'day',
            'price' => 1200,
            'status' => 'active',
        ]);

        $response = $this->from(route('public-booking.index'))->post(route('public-booking.store'), [
            ...$this->bookingPayload($room),
            'hotel_room_package_id' => $package->id,
        ]);

        $response->assertRedirect(route('public-booking.index'));
        $response->assertSessionHasErrors('hotel_room_package_id');
        $this->assertSame(0, HotelBooking::count());
    }

    public function test_public_room_booking_accepts_global_package(): void
    {
        $room = $this->room();
        $package = HotelRoomPackage::create([
            'name' => 'Standard Overnight',
            'included_adults' => 2,
            'included_children' => 0,
            'duration_value' => 1,
            'duration_unit' => 'night',
            'price' => 1500,
            'status' => 'active',
        ]);

        $response = $this->from(route('public-booking.index'))->post(route('public-booking.store'), [
            ...$this->bookingPayload($room),
            'hotel_room_package_id' => $package->id,
        ]);

        $response->assertRedirect(route('public-booking.index'));
        $response->assertSessionDoesntHaveErrors();
        $this->assertSame(1, HotelBooking::count());
    }

    public function test_public_room_booking_rejects_inactive_package(): void
    {
        $room = $this->room();
        $package = HotelRoomPackage::create([
            'name' => 'Inactive Overnight',
            'included_adults' => 2,
            'included_children' => 0,
            'duration_value' => 1,
            'duration_unit' => 'night',
            'price' => 1500,
            'status' => 'inactive',
        ]);

        $response = $this->from(route('public-booking.index'))->post(route('public-booking.store'), [
            ...$this->bookingPayload($room),
            'hotel_room_package_id' => $package->id,
        ]);

        $response->assertRedirect(route('public-booking.index'));
        $response->assertSessionHasErrors('hotel_room_package_id');
        $this->assertSame(0, HotelBooking::count());
    }

    public function test_public_room_booking_rejects_overlapping_pending_booking(): void
    {
        $room = $this->room();
        HotelBooking::create([
            ...$this->storedBookingPayload($room),
            'booking_status' => 'pending',
        ]);

        $response = $this->from(route('public-booking.index'))->post(route('public-booking.store'), $this->bookingPayload($room));

        $response->assertRedirect(route('public-booking.index'));
        $response->assertSessionHasErrors('check_in_at');
        $this->assertSame(1, HotelBooking::count());
    }

    public function test_admin_booking_rejects_overlapping_pending_booking(): void
    {
        $this->withoutMiddleware();

        $room = $this->room();
        HotelBooking::create([
            ...$this->storedBookingPayload($room),
            'booking_status' => 'pending',
        ]);

        $response = $this->from(route('hotel-bookings.index'))->post(route('hotel-bookings.bookings.store'), [
            ...$this->bookingPayload($room),
            'discount_amount' => 0,
            'additional_fees' => 0,
            'deposit_amount' => '',
            'payment_status' => 'unpaid',
            'booking_status' => 'pending',
        ]);

        $response->assertRedirect(route('hotel-bookings.index'));
        $response->assertSessionHasErrors('check_in_at');
        $this->assertSame(1, HotelBooking::count());
    }

    private function room(): HotelRoom
    {
        $building = HotelBuilding::create([
            'name' => 'Guest House',
            'status' => 'active',
        ]);

        $room = HotelRoom::create([
            'hotel_building_id' => $building->id,
            'name' => 'Room 101',
            'max_adult_capacity' => 4,
            'max_child_capacity' => 2,
            'base_capacity' => 2,
            'status' => 'available',
        ]);

        $room->pricing()->create([
            'base_price' => 1000,
            'price_type' => 'per_night',
        ]);

        return $room;
    }

    private function bookingPayload(HotelRoom $room): array
    {
        return [
            'booking_target_type' => 'room',
            'hotel_room_id' => $room->id,
            'guest_name' => 'Test Guest',
            'contact_number' => '09123456789',
            'email' => 'guest@example.test',
            'check_in_at' => '2026-06-10 14:00:00',
            'check_out_at' => '2026-06-11 12:00:00',
            'adults' => 2,
            'children' => 0,
        ];
    }

    private function storedBookingPayload(HotelRoom $room): array
    {
        return [
            'hotel_room_id' => $room->id,
            'guest_name' => 'Existing Guest',
            'contact_number' => '09123456789',
            'email' => 'existing@example.test',
            'check_in_at' => '2026-06-10 14:00:00',
            'check_out_at' => '2026-06-11 12:00:00',
            'adults' => 2,
            'children' => 0,
            'discount_amount' => 0,
            'additional_fees' => 0,
            'deposit_amount' => 0,
            'total_amount' => 1000,
            'payment_status' => 'unpaid',
        ];
    }
}
