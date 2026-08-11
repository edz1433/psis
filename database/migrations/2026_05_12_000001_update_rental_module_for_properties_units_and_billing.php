<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rental_properties', function (Blueprint $table) {
            $table->boolean('has_rooms_units')->default(false)->after('type');
        });

        Schema::create('rental_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('rental_properties')->cascadeOnDelete();
            $table->string('name');
            $table->string('floor_level')->nullable();
            $table->unsignedInteger('capacity')->default(1);
            $table->string('status')->default('available');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['property_id', 'name']);
        });

        Schema::table('rental_tenants', function (Blueprint $table) {
            $table->foreignId('room_unit_id')->nullable()->after('property_id')->constrained('rental_units')->nullOnDelete();
        });

        Schema::table('rental_payments', function (Blueprint $table) {
            $table->foreignId('room_unit_id')->nullable()->after('property_id')->constrained('rental_units')->nullOnDelete();
            $table->string('billing_month', 7)->nullable()->after('room_unit_id');
            $table->decimal('paid_amount', 10, 2)->default(0)->after('amount');
            $table->date('payment_date')->nullable()->change();
            $table->string('status')->default('unpaid')->change();

            $table->unique(['tenant_id', 'billing_month']);
        });
    }

    public function down(): void
    {
        Schema::table('rental_payments', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'billing_month']);
            $table->dropConstrainedForeignId('room_unit_id');
            $table->dropColumn(['billing_month', 'paid_amount']);
            $table->date('payment_date')->nullable(false)->change();
            $table->string('status')->default('paid')->change();
        });

        Schema::table('rental_tenants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('room_unit_id');
        });

        Schema::dropIfExists('rental_units');

        Schema::table('rental_properties', function (Blueprint $table) {
            $table->dropColumn('has_rooms_units');
        });
    }
};
