<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('rental_maintenance');
    }

    public function down(): void
    {
        Schema::create('rental_maintenance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('rental_properties')->cascadeOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('rental_tenants')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('category')->default('other');
            $table->string('priority')->default('medium');
            $table->string('status')->default('pending');
            $table->string('assigned_to')->nullable();
            $table->decimal('estimated_cost', 10, 2)->nullable();
            $table->decimal('actual_cost', 10, 2)->nullable();
            $table->date('scheduled_date')->nullable();
            $table->date('completed_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }
};
