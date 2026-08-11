<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rental_tenants', function (Blueprint $table) {
            $table->dropColumn(['lease_start', 'lease_end', 'security_deposit', 'deposit_paid']);
        });
    }

    public function down(): void
    {
        Schema::table('rental_tenants', function (Blueprint $table) {
            $table->date('lease_start')->nullable()->after('emergency_contact_phone');
            $table->date('lease_end')->nullable()->after('lease_start');
            $table->decimal('security_deposit', 10, 2)->default(0)->after('monthly_rent');
            $table->boolean('deposit_paid')->default(false)->after('security_deposit');
        });
    }
};
