<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        if (Schema::hasColumn('users', 'email')) {
            User::query()->where('email', 'test@example.com')->first()
                ?? User::factory()->create([
                    'name' => 'Test User',
                    'email' => 'test@example.com',
                ]);
        }

        $this->call(RentalSeeder::class);
        $this->call(HotelBookingSeeder::class);
    }
}
