<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hotel_facilities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('facility_type')->default('pool')->index();
            $table->string('location')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('max_adult_capacity')->default(1);
            $table->unsignedInteger('max_child_capacity')->default(0);
            $table->unsignedInteger('base_capacity')->default(1);
            $table->enum('status', ['available', 'unavailable', 'maintenance', 'inactive'])->default('available')->index();
            $table->decimal('base_price', 12, 2)->default(0);
            $table->enum('price_type', ['per_hour', 'per_day'])->default('per_day');
            $table->decimal('weekend_price', 12, 2)->nullable();
            $table->decimal('holiday_price', 12, 2)->nullable();
            $table->decimal('extra_adult_price', 12, 2)->default(0);
            $table->decimal('extra_child_price', 12, 2)->default(0);
            $table->string('child_age_rule')->nullable();
            $table->decimal('security_deposit', 12, 2)->default(0);
            $table->decimal('cleaning_fee', 12, 2)->default(0);
            $table->json('other_fees')->nullable();
            $table->text('rules_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('hotel_facility_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_facility_id')->constrained('hotel_facilities')->cascadeOnDelete();
            $table->string('path');
            $table->string('original_name')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
        });

        Schema::table('hotel_room_packages', function (Blueprint $table) {
            $table->foreignId('hotel_facility_id')->nullable()->after('hotel_room_id')->constrained('hotel_facilities')->cascadeOnDelete();
        });

        Schema::table('hotel_bookings', function (Blueprint $table) {
            $table->foreignId('hotel_facility_id')->nullable()->after('hotel_room_id')->constrained('hotel_facilities')->restrictOnDelete();
            $table->foreignId('hotel_room_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('hotel_bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('hotel_facility_id');
            $table->foreignId('hotel_room_id')->nullable(false)->change();
        });

        Schema::table('hotel_room_packages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('hotel_facility_id');
        });

        Schema::dropIfExists('hotel_facility_images');
        Schema::dropIfExists('hotel_facilities');
    }
};
