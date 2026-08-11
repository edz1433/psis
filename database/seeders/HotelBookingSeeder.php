<?php

namespace Database\Seeders;

use App\Models\HotelAmenity;
use App\Models\HotelBooking;
use App\Models\HotelBuilding;
use App\Models\HotelFacility;
use App\Models\HotelRoom;
use App\Models\HotelRoomPackage;
use App\Services\HotelBookingPriceCalculator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class HotelBookingSeeder extends Seeder
{
    public function run(): void
    {
        $buildingImages = $this->defaultImages('building', ['building-1.avif', 'building-2.avif']);
        $roomImages = $this->defaultImages('rooms', ['1.avif', '2.avif', '3.avif']);

        $buildings = collect([
            ['name' => 'Garden Wing', 'description' => 'Quiet rooms near landscaped gardens and shaded walkways.', 'location' => 'East resort area', 'status' => 'active'],
            ['name' => 'Poolside Villas', 'description' => 'Guest rooms close to the swimming pool and open-air cottages.', 'location' => 'Pool area', 'status' => 'active'],
            ['name' => 'Main Hotel Building', 'description' => 'Standard hotel rooms near the lobby, reception, and cafe.', 'location' => 'Front entrance', 'status' => 'active'],
            ['name' => 'Family Annex', 'description' => 'Larger rooms for families, groups, and barkada stays.', 'location' => 'North annex', 'status' => 'active'],
            ['name' => 'Hilltop Suites', 'description' => 'Premium rooms with elevated campus and resort views.', 'location' => 'Upper resort area', 'status' => 'active'],
        ])->mapWithKeys(function (array $data, int $index) use ($buildingImages) {
            $building = HotelBuilding::updateOrCreate(['name' => $data['name']], $data);

            $building->images()
                ->where(fn ($query) => $query
                    ->where('path', 'like', 'hotel/seed/%')
                    ->orWhere('path', 'like', 'building/default-%'))
                ->delete();

            $path = $buildingImages[$index % count($buildingImages)];
            $image = $building->images()->updateOrCreate(
                ['path' => $path],
                ['original_name' => basename($path), 'sort_order' => 1, 'is_primary' => true],
            );
            $building->images()->whereKeyNot($image->id)->update(['is_primary' => false]);

            return [$building->name => $building];
        });

        $amenities = collect([
            ['name' => 'Air Conditioning', 'description' => 'Individual room cooling.', 'status' => 'active'],
            ['name' => 'WiFi', 'description' => 'Wireless internet access.', 'status' => 'active'],
            ['name' => 'Private Bathroom', 'description' => 'Private toilet and bath.', 'status' => 'active'],
            ['name' => 'Television', 'description' => 'In-room TV entertainment.', 'status' => 'active'],
            ['name' => 'Mini Refrigerator', 'description' => 'Compact refrigerator for guest use.', 'status' => 'active'],
            ['name' => 'Pool Access', 'description' => 'Access to pool area during allowed hours.', 'status' => 'active'],
        ])->mapWithKeys(fn (array $data) => [
            $data['name'] => HotelAmenity::updateOrCreate(['name' => $data['name']], $data),
        ]);

        $rooms = collect([
            ['building' => 'Garden Wing', 'name' => 'GW-101 Deluxe', 'room_type' => 'deluxe', 'floor_number' => '1', 'max_adult_capacity' => 2, 'max_child_capacity' => 2, 'base_capacity' => 2, 'base_price' => 2800],
            ['building' => 'Poolside Villas', 'name' => 'PV-201 Pool View', 'room_type' => 'villa', 'floor_number' => '2', 'max_adult_capacity' => 4, 'max_child_capacity' => 2, 'base_capacity' => 2, 'base_price' => 4200],
            ['building' => 'Main Hotel Building', 'name' => 'MH-305 Standard', 'room_type' => 'standard', 'floor_number' => '3', 'max_adult_capacity' => 2, 'max_child_capacity' => 1, 'base_capacity' => 2, 'base_price' => 2200],
            ['building' => 'Family Annex', 'name' => 'FA-102 Family Room', 'room_type' => 'family', 'floor_number' => '1', 'max_adult_capacity' => 6, 'max_child_capacity' => 4, 'base_capacity' => 4, 'base_price' => 5200],
            ['building' => 'Hilltop Suites', 'name' => 'HS-401 Premium Suite', 'room_type' => 'suite', 'floor_number' => '4', 'max_adult_capacity' => 3, 'max_child_capacity' => 2, 'base_capacity' => 2, 'base_price' => 6500],
        ])->mapWithKeys(function (array $data, int $index) use ($buildings, $amenities, $roomImages) {
            $room = HotelRoom::updateOrCreate(
                ['name' => $data['name']],
                [
                    'hotel_building_id' => $buildings[$data['building']]->id,
                    'room_type' => $data['room_type'],
                    'floor_number' => $data['floor_number'],
                    'description' => ucfirst($data['room_type']).' room with comfortable guest amenities and easy access to campus services.',
                    'max_adult_capacity' => $data['max_adult_capacity'],
                    'max_child_capacity' => $data['max_child_capacity'],
                    'base_capacity' => $data['base_capacity'],
                    'status' => 'available',
                    'rules_notes' => 'No smoking. Valid ID is required at check-in.',
                ],
            );

            $room->pricing()->updateOrCreate(
                [],
                [
                    'base_price' => $data['base_price'],
                    'price_type' => 'per_night',
                    'weekend_price' => $data['base_price'] + 500,
                    'holiday_price' => $data['base_price'] + 900,
                    'extra_adult_price' => 650,
                    'extra_child_price' => 350,
                    'child_age_rule' => 'Children 7 years old and below count as child guests.',
                    'security_deposit' => 1000,
                    'cleaning_fee' => 250,
                    'other_fees' => [['label' => 'Linen service', 'amount' => 150]],
                ],
            );

            $room->amenities()->sync($amenities->only(['Air Conditioning', 'WiFi', 'Private Bathroom', 'Television', 'Mini Refrigerator'])->pluck('id')->all());

            $room->images()
                ->where(fn ($query) => $query
                    ->where('path', 'like', 'hotel/seed/%')
                    ->orWhere('path', 'like', 'rooms/default-%'))
                ->delete();

            $path = $roomImages[$index % count($roomImages)];
            $image = $room->images()->updateOrCreate(
                ['path' => $path],
                ['original_name' => basename($path), 'sort_order' => 1, 'is_primary' => true],
            );
            $room->images()->whereKeyNot($image->id)->update(['is_primary' => false]);

            return [$room->name => $room];
        });

        $facilities = collect([
            ['name' => 'Main Swimming Pool', 'facility_type' => 'pool', 'location' => 'Poolside area', 'base_capacity' => 25, 'max_adult_capacity' => 50, 'max_child_capacity' => 35, 'base_price' => 4500],
            ['name' => 'Garden Pavilion', 'facility_type' => 'pavilion', 'location' => 'Garden area', 'base_capacity' => 30, 'max_adult_capacity' => 80, 'max_child_capacity' => 40, 'base_price' => 6500],
            ['name' => 'Barkada Cottage A', 'facility_type' => 'cottage', 'location' => 'Poolside cottages', 'base_capacity' => 10, 'max_adult_capacity' => 20, 'max_child_capacity' => 15, 'base_price' => 1800],
            ['name' => 'Function Hall', 'facility_type' => 'function_hall', 'location' => 'Main building ground floor', 'base_capacity' => 60, 'max_adult_capacity' => 150, 'max_child_capacity' => 80, 'base_price' => 12000],
            ['name' => 'KTV Room', 'facility_type' => 'ktv_room', 'location' => 'Entertainment wing', 'base_capacity' => 8, 'max_adult_capacity' => 15, 'max_child_capacity' => 5, 'base_price' => 2500],
        ])->mapWithKeys(function (array $data, int $index) use ($roomImages) {
            $facility = HotelFacility::updateOrCreate(
                ['name' => $data['name']],
                [
                    ...$data,
                    'description' => 'Bookable '.str_replace('_', ' ', $data['facility_type']).' for day use, group activities, and campus guest services.',
                    'status' => 'available',
                    'price_type' => in_array($data['facility_type'], ['ktv_room'], true) ? 'per_hour' : 'per_day',
                    'weekend_price' => $data['base_price'] + 750,
                    'holiday_price' => $data['base_price'] + 1200,
                    'extra_adult_price' => 150,
                    'extra_child_price' => 100,
                    'child_age_rule' => 'Children 7 years old and below count as child guests.',
                    'security_deposit' => 1000,
                    'cleaning_fee' => 500,
                    'other_fees' => [['label' => 'Utility fee', 'amount' => 300]],
                    'rules_notes' => 'Outside vendors require admin approval.',
                ],
            );

            $facility->images()
                ->where(fn ($query) => $query
                    ->where('path', 'like', 'hotel/seed/%')
                    ->orWhere('path', 'like', 'rooms/default-%'))
                ->delete();

            $path = $roomImages[$index % count($roomImages)];
            $image = $facility->images()->updateOrCreate(
                ['path' => $path],
                ['original_name' => basename($path), 'sort_order' => 1, 'is_primary' => true],
            );
            $facility->images()->whereKeyNot($image->id)->update(['is_primary' => false]);

            return [$facility->name => $facility];
        });

        $packages = collect([
            ['name' => 'Standard Stay', 'room' => 'MH-305 Standard', 'duration_unit' => 'night', 'duration_value' => 1, 'price' => 2400, 'included_adults' => 2, 'included_children' => 1],
            ['name' => 'Family Overnight', 'room' => 'FA-102 Family Room', 'duration_unit' => 'night', 'duration_value' => 1, 'price' => 6200, 'included_adults' => 4, 'included_children' => 2],
            ['name' => 'Couple Suite Package', 'room' => 'HS-401 Premium Suite', 'duration_unit' => 'night', 'duration_value' => 1, 'price' => 7200, 'included_adults' => 2, 'included_children' => 0],
            ['name' => 'Pool Day Use', 'facility' => 'Main Swimming Pool', 'duration_unit' => 'day', 'duration_value' => 1, 'price' => 5500, 'included_adults' => 25, 'included_children' => 15],
            ['name' => 'Barkada Cottage Day Use', 'facility' => 'Barkada Cottage A', 'duration_unit' => 'day', 'duration_value' => 1, 'price' => 2500, 'included_adults' => 10, 'included_children' => 5],
        ])->mapWithKeys(function (array $data) use ($rooms, $facilities) {
            $package = HotelRoomPackage::updateOrCreate(
                ['name' => $data['name']],
                [
                    'hotel_room_id' => isset($data['room']) ? $rooms[$data['room']]->id : null,
                    'hotel_facility_id' => isset($data['facility']) ? $facilities[$data['facility']]->id : null,
                    'description' => "{$data['name']} package for customer booking requests.",
                    'included_adults' => $data['included_adults'],
                    'included_children' => $data['included_children'],
                    'duration_value' => $data['duration_value'],
                    'duration_unit' => $data['duration_unit'],
                    'price' => $data['price'],
                    'extra_adult_charge' => 500,
                    'extra_child_charge' => 250,
                    'inclusions' => ['Use of assigned space', 'Basic toiletries or facility access', 'Front desk assistance'],
                    'status' => 'active',
                ],
            );

            return [$package->name => $package];
        });

        $calculator = app(HotelBookingPriceCalculator::class);
        $bookings = [
            ['guest_name' => 'Maria Santos', 'room' => 'MH-305 Standard', 'package' => 'Standard Stay', 'check_in_at' => '2026-06-02 14:00:00', 'check_out_at' => '2026-06-03 12:00:00', 'adults' => 2, 'children' => 1, 'payment_status' => 'paid', 'booking_status' => 'confirmed'],
            ['guest_name' => 'Juan Dela Cruz', 'room' => 'FA-102 Family Room', 'package' => 'Family Overnight', 'check_in_at' => '2026-06-05 14:00:00', 'check_out_at' => '2026-06-06 12:00:00', 'adults' => 5, 'children' => 3, 'payment_status' => 'partial', 'booking_status' => 'confirmed'],
            ['guest_name' => 'Grace Lim', 'room' => 'HS-401 Premium Suite', 'package' => 'Couple Suite Package', 'check_in_at' => '2026-06-08 15:00:00', 'check_out_at' => '2026-06-09 12:00:00', 'adults' => 2, 'children' => 0, 'payment_status' => 'unpaid', 'booking_status' => 'pending'],
            ['guest_name' => 'Pedro Reyes', 'facility' => 'Main Swimming Pool', 'package' => 'Pool Day Use', 'check_in_at' => '2026-06-10 08:00:00', 'check_out_at' => '2026-06-10 17:00:00', 'adults' => 30, 'children' => 18, 'payment_status' => 'partial', 'booking_status' => 'confirmed'],
            ['guest_name' => 'Ana Garcia', 'facility' => 'Barkada Cottage A', 'package' => 'Barkada Cottage Day Use', 'check_in_at' => '2026-06-12 08:00:00', 'check_out_at' => '2026-06-12 18:00:00', 'adults' => 12, 'children' => 4, 'payment_status' => 'paid', 'booking_status' => 'confirmed'],
        ];

        foreach ($bookings as $data) {
            $room = isset($data['room']) ? $rooms[$data['room']] : null;
            $facility = isset($data['facility']) ? $facilities[$data['facility']] : null;
            $package = $packages[$data['package']];
            $payload = [
                'booking_target_type' => $facility ? 'facility' : 'room',
                'hotel_room_id' => $room?->id,
                'hotel_facility_id' => $facility?->id,
                'hotel_room_package_id' => $package->id,
                'guest_name' => $data['guest_name'],
                'contact_number' => '0917'.random_int(1000000, 9999999),
                'email' => str($data['guest_name'])->lower()->replace(' ', '.')->append('@example.com')->toString(),
                'check_in_at' => $data['check_in_at'],
                'check_out_at' => $data['check_out_at'],
                'adults' => $data['adults'],
                'children' => $data['children'],
                'discount_amount' => 0,
                'additional_fees' => 0,
                'deposit_amount' => '',
                'payment_status' => $data['payment_status'],
                'booking_status' => $data['booking_status'],
                'notes' => 'Customer booking request sample.',
            ];

            $calculated = $calculator->calculate($payload);
            unset($payload['booking_target_type']);
            $payload['deposit_amount'] = $calculated['deposit_amount'];
            $payload['total_amount'] = $calculated['total_amount'];

            $booking = HotelBooking::updateOrCreate(
                ['guest_name' => $data['guest_name'], 'check_in_at' => $data['check_in_at']],
                $payload,
            );

            $booking->charges()->delete();
            $booking->charges()->createMany($calculated['charges']);
        }
    }

    private function defaultImages(string $folder, array $filenames): array
    {
        $directory = public_path($folder);
        File::ensureDirectoryExists($directory);

        return collect($filenames)
            ->each(fn (string $filename) => $this->copyDefaultImageIfMissing($folder, $filename))
            ->filter(fn (string $filename) => File::exists(public_path($folder.'/'.$filename)))
            ->map(fn (string $filename) => $folder.'/'.$filename)
            ->values()
            ->all();
    }

    private function copyDefaultImageIfMissing(string $folder, string $filename): void
    {
        $destination = public_path($folder.'/'.$filename);

        if (File::exists($destination)) {
            return;
        }

        $sourceFolder = $folder === 'building' ? 'buildings' : $folder;
        $source = storage_path('app/public/hotel/'.$sourceFolder.'/'.$filename);

        if (File::exists($source)) {
            File::copy($source, $destination);
        }
    }
}
