<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rental_properties', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type')->default('room'); // apartment, room, commercial, studio, house, dormitory
            $table->string('address');
            $table->text('description')->nullable();
            $table->decimal('monthly_rate', 10, 2);
            $table->decimal('floor_area', 8, 2)->nullable();        // in sqm
            $table->integer('total_units')->default(1);
            $table->string('status')->default('available');         // available, occupied, maintenance, reserved
            $table->json('amenities')->nullable();                   // e.g. ["WiFi","Water","Parking"]
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rental_properties');
    }
};
