<?php

namespace Database\Seeders;

use App\Helpers\MenuHelper;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $supplier = Supplier::query()->firstOrCreate(
            ['name' => 'CPSU Main Campus'],
            [
                'is_campus' => true,
                'contact_person' => 'System Administrator',
            ]
        );

        $admin = User::query()->firstOrNew([
            'username' => env('ADMIN_USERNAME', 'admin'),
        ]);

        $admin->fill([
            'name' => 'System Administrator',
            'fname' => 'System',
            'lname' => 'Administrator',
            'email' => env('ADMIN_EMAIL', 'admin@example.com'),
            'role' => '1',
            'supplier_id' => $supplier->id,
            'access' => MenuHelper::ids(),
        ]);

        if (! $admin->exists || env('ADMIN_PASSWORD')) {
            $admin->password = Hash::make(env('ADMIN_PASSWORD', 'password'));
        }

        $admin->save();
    }
}
