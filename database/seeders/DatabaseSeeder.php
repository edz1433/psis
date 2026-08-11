<?php

namespace Database\Seeders;

use App\Helpers\MenuHelper;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $supplier = Supplier::query()->firstOrCreate(
            ['name' => 'CPSU Main Campus'],
            [
                'is_campus' => true,
                'contact_person' => 'System Administrator',
            ]
        );

        User::query()->firstOrCreate(
            ['username' => env('ADMIN_USERNAME', 'admin')],
            [
                'name' => 'System Administrator',
                'fname' => 'System',
                'lname' => 'Administrator',
                'email' => env('ADMIN_EMAIL', 'admin@example.com'),
                'password' => Hash::make(env('ADMIN_PASSWORD', 'password')),
                'role' => '1',
                'supplier_id' => $supplier->id,
                'access' => MenuHelper::ids(),
            ]
        );

        $this->call(RentalSeeder::class);
        $this->call(HotelBookingSeeder::class);
    }
}
