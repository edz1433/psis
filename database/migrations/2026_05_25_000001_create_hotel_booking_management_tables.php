<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hotel_buildings', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active')->index();
            $table->timestamps();
        });

        Schema::create('hotel_building_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_building_id')->constrained('hotel_buildings')->cascadeOnDelete();
            $table->string('path');
            $table->string('original_name')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
        });

        Schema::create('hotel_amenities', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('description')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active')->index();
            $table->timestamps();
        });

        Schema::create('hotel_rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_building_id')->constrained('hotel_buildings')->restrictOnDelete();
            $table->string('name');
            $table->string('room_type')->nullable()->index();
            $table->string('floor_number')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('max_adult_capacity')->default(1);
            $table->unsignedInteger('max_child_capacity')->default(0);
            $table->unsignedInteger('base_capacity')->default(1);
            $table->enum('status', ['available', 'unavailable', 'maintenance', 'inactive'])->default('available')->index();
            $table->text('rules_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('hotel_room_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_room_id')->constrained('hotel_rooms')->cascadeOnDelete();
            $table->string('path');
            $table->string('original_name')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
        });

        Schema::create('hotel_room_amenity', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_room_id')->constrained('hotel_rooms')->cascadeOnDelete();
            $table->foreignId('hotel_amenity_id')->constrained('hotel_amenities')->cascadeOnDelete();
            $table->unique(['hotel_room_id', 'hotel_amenity_id']);
        });

        Schema::create('hotel_room_pricings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_room_id')->unique()->constrained('hotel_rooms')->cascadeOnDelete();
            $table->decimal('base_price', 12, 2)->default(0);
            $table->enum('price_type', ['per_night', 'per_hour', 'per_day'])->default('per_night');
            $table->decimal('weekend_price', 12, 2)->nullable();
            $table->decimal('holiday_price', 12, 2)->nullable();
            $table->decimal('extra_adult_price', 12, 2)->default(0);
            $table->decimal('extra_child_price', 12, 2)->default(0);
            $table->string('child_age_rule')->nullable();
            $table->decimal('security_deposit', 12, 2)->default(0);
            $table->decimal('cleaning_fee', 12, 2)->default(0);
            $table->json('other_fees')->nullable();
            $table->timestamps();
        });

        Schema::create('hotel_room_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_room_id')->nullable()->constrained('hotel_rooms')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('included_adults')->default(1);
            $table->unsignedInteger('included_children')->default(0);
            $table->unsignedInteger('duration_value')->default(1);
            $table->enum('duration_unit', ['hour', 'day', 'night'])->default('night');
            $table->decimal('price', 12, 2)->default(0);
            $table->decimal('extra_adult_charge', 12, 2)->default(0);
            $table->decimal('extra_child_charge', 12, 2)->default(0);
            $table->json('inclusions')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active')->index();
            $table->timestamps();
        });

        Schema::create('hotel_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_room_id')->constrained('hotel_rooms')->restrictOnDelete();
            $table->foreignId('hotel_room_package_id')->nullable()->constrained('hotel_room_packages')->nullOnDelete();
            $table->string('guest_name');
            $table->string('contact_number')->nullable();
            $table->string('email')->nullable();
            $table->dateTime('check_in_at');
            $table->dateTime('check_out_at');
            $table->unsignedInteger('adults')->default(1);
            $table->unsignedInteger('children')->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('additional_fees', 12, 2)->default(0);
            $table->decimal('deposit_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->enum('payment_status', ['unpaid', 'partial', 'paid', 'refunded'])->default('unpaid')->index();
            $table->enum('booking_status', ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show'])->default('pending')->index();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('hotel_booking_charges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_booking_id')->constrained('hotel_bookings')->cascadeOnDelete();
            $table->string('label');
            $table->string('type')->default('charge');
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('unit_amount', 12, 2)->default(0);
            $table->decimal('amount', 12, 2)->default(0);
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotel_booking_charges');
        Schema::dropIfExists('hotel_bookings');
        Schema::dropIfExists('hotel_room_packages');
        Schema::dropIfExists('hotel_room_pricings');
        Schema::dropIfExists('hotel_room_amenity');
        Schema::dropIfExists('hotel_room_images');
        Schema::dropIfExists('hotel_rooms');
        Schema::dropIfExists('hotel_amenities');
        Schema::dropIfExists('hotel_building_images');
        Schema::dropIfExists('hotel_buildings');
    }
};
