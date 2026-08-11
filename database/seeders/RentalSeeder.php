<?php

namespace Database\Seeders;

use App\Models\RentalProperty;
use App\Models\RentalTenant;
use App\Models\RentalUnit;
use App\Models\User;
use Illuminate\Database\Seeder;

class RentalSeeder extends Seeder
{
    public function run(): void
    {
        $createdBy = User::query()->first()?->id;

        $properties = [
            [
                'attributes' => ['name' => 'Riverside Dormitory'],
                'values' => [
                    'type' => 'dormitory',
                    'has_rooms_units' => true,
                    'address' => 'Riverside Avenue, Kabnkalan City',
                    'description' => 'Student-friendly dormitory near campus.',
                    'monthly_rate' => 4500,
                    'floor_area' => 180,
                    'total_units' => 4,
                    'status' => 'occupied',
                    'amenities' => ['WiFi', 'Water', 'Study Area'],
                    'notes' => 'Seeded rental property.',
                ],
                'units' => [
                    ['name' => 'Room 101', 'floor_level' => '1st Floor', 'capacity' => 2, 'status' => 'occupied'],
                    ['name' => 'Room 102', 'floor_level' => '1st Floor', 'capacity' => 2, 'status' => 'occupied'],
                ],
            ],
            [
                'attributes' => ['name' => 'Mabini Apartment'],
                'values' => [
                    'type' => 'apartment_rental',
                    'has_rooms_units' => true,
                    'address' => 'Mabini Street, Kabnkalan City',
                    'description' => 'Small apartment building for long-term renters.',
                    'monthly_rate' => 8500,
                    'floor_area' => 240,
                    'total_units' => 3,
                    'status' => 'occupied',
                    'amenities' => ['Parking', 'Water', 'Laundry Area'],
                    'notes' => 'Seeded rental property.',
                ],
                'units' => [
                    ['name' => 'Unit A', 'floor_level' => 'Ground Floor', 'capacity' => 2, 'status' => 'occupied'],
                    ['name' => 'Unit B', 'floor_level' => '2nd Floor', 'capacity' => 2, 'status' => 'available'],
                ],
            ],
            [
                'attributes' => ['name' => 'Central Market Stall'],
                'values' => [
                    'type' => 'stall',
                    'has_rooms_units' => false,
                    'address' => 'Block C, Central Market, Kabnkalan City',
                    'description' => 'Commercial stall for small retail operations.',
                    'monthly_rate' => 12000,
                    'floor_area' => 24,
                    'total_units' => 1,
                    'status' => 'occupied',
                    'amenities' => ['Electricity', 'Security'],
                    'notes' => 'Seeded rental property.',
                ],
                'units' => [],
            ],
        ];

        $seededProperties = [];
        $seededUnits = [];

        foreach ($properties as $propertyData) {
            $property = RentalProperty::updateOrCreate(
                $propertyData['attributes'],
                $propertyData['values'],
            );

            $seededProperties[$property->name] = $property;

            foreach ($propertyData['units'] as $unitData) {
                $unit = RentalUnit::updateOrCreate(
                    [
                        'property_id' => $property->id,
                        'name' => $unitData['name'],
                    ],
                    $unitData,
                );

                $seededUnits[$property->name][$unit->name] = $unit;
            }
        }

        $tenants = [
            [
                'email' => 'ana.santos@example.com',
                'property' => 'Riverside Dormitory',
                'unit' => 'Room 101',
                'first_name' => 'Ana',
                'last_name' => 'Santos',
                'phone' => '09171234501',
                'national_id' => 'PH-1001',
                'address' => 'Kabnkalan City',
                'occupation' => 'Student',
                'emergency_contact_name' => 'Maria Santos',
                'emergency_contact_phone' => '09181234501',
                'monthly_rent' => 4500,
                'status' => 'active',
                'notes' => 'Seeded rental tenant.',
            ],
            [
                'email' => 'benjamin.cruz@example.com',
                'property' => 'Riverside Dormitory',
                'unit' => 'Room 101',
                'first_name' => 'Benjamin',
                'last_name' => 'Cruz',
                'phone' => '09171234502',
                'national_id' => 'PH-1002',
                'address' => 'Kabnkalan City',
                'occupation' => 'Student',
                'emergency_contact_name' => 'Liza Cruz',
                'emergency_contact_phone' => '09181234502',
                'monthly_rent' => 4500,
                'status' => 'active',
                'notes' => 'Seeded rental tenant.',
            ],
            [
                'email' => 'carla.reyes@example.com',
                'property' => 'Riverside Dormitory',
                'unit' => 'Room 102',
                'first_name' => 'Carla',
                'last_name' => 'Reyes',
                'phone' => '09171234503',
                'national_id' => 'PH-1003',
                'address' => 'Kabnkalan City',
                'occupation' => 'Student',
                'emergency_contact_name' => 'Ramon Reyes',
                'emergency_contact_phone' => '09181234503',
                'monthly_rent' => 4500,
                'status' => 'active',
                'notes' => 'Seeded rental tenant.',
            ],
            [
                'email' => 'daniel.garcia@example.com',
                'property' => 'Mabini Apartment',
                'unit' => 'Unit A',
                'first_name' => 'Daniel',
                'last_name' => 'Garcia',
                'phone' => '09171234504',
                'national_id' => 'PH-1004',
                'address' => 'Kabnkalan City',
                'occupation' => 'Teacher',
                'emergency_contact_name' => 'Elena Garcia',
                'emergency_contact_phone' => '09181234504',
                'monthly_rent' => 8500,
                'status' => 'active',
                'notes' => 'Seeded rental tenant.',
            ],
            [
                'email' => 'erika.lim@example.com',
                'property' => 'Mabini Apartment',
                'unit' => 'Unit A',
                'first_name' => 'Erika',
                'last_name' => 'Lim',
                'phone' => '09171234505',
                'national_id' => 'PH-1005',
                'address' => 'Kabnkalan City',
                'occupation' => 'Nurse',
                'emergency_contact_name' => 'Tony Lim',
                'emergency_contact_phone' => '09181234505',
                'monthly_rent' => 8500,
                'status' => 'active',
                'notes' => 'Seeded rental tenant.',
            ],
            [
                'email' => 'felix.tan@example.com',
                'property' => 'Central Market Stall',
                'unit' => null,
                'first_name' => 'Felix',
                'last_name' => 'Tan',
                'phone' => '09171234506',
                'national_id' => 'PH-1006',
                'address' => 'Kabnkalan City',
                'occupation' => 'Vendor',
                'emergency_contact_name' => 'Grace Tan',
                'emergency_contact_phone' => '09181234506',
                'monthly_rent' => 12000,
                'status' => 'active',
                'notes' => 'Seeded rental tenant.',
            ],
        ];

        foreach ($tenants as $tenantData) {
            $property = $seededProperties[$tenantData['property']];
            $unit = $tenantData['unit']
                ? $seededUnits[$tenantData['property']][$tenantData['unit']]
                : null;

            RentalTenant::updateOrCreate(
                ['email' => $tenantData['email']],
                [
                    'property_id' => $property->id,
                    'room_unit_id' => $unit?->id,
                    'first_name' => $tenantData['first_name'],
                    'last_name' => $tenantData['last_name'],
                    'phone' => $tenantData['phone'],
                    'national_id' => $tenantData['national_id'],
                    'address' => $tenantData['address'],
                    'occupation' => $tenantData['occupation'],
                    'emergency_contact_name' => $tenantData['emergency_contact_name'],
                    'emergency_contact_phone' => $tenantData['emergency_contact_phone'],
                    'monthly_rent' => $tenantData['monthly_rent'],
                    'status' => $tenantData['status'],
                    'notes' => $tenantData['notes'],
                    'created_by' => $createdBy,
                ],
            );
        }
    }
}
