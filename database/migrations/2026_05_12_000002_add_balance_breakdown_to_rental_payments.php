<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rental_payments', function (Blueprint $table) {
            $table->decimal('monthly_rent_amount', 10, 2)->default(0)->after('billing_month');
            $table->decimal('previous_balance', 10, 2)->default(0)->after('monthly_rent_amount');
        });
    }

    public function down(): void
    {
        Schema::table('rental_payments', function (Blueprint $table) {
            $table->dropColumn(['monthly_rent_amount', 'previous_balance']);
        });
    }
};
