<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rental_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('rental_tenants')->cascadeOnDelete();
            $table->foreignId('property_id')->constrained('rental_properties')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->date('payment_date');
            $table->date('due_date');
            $table->date('period_start');
            $table->date('period_end');
            $table->string('payment_method')->default('cash');       // cash, bank_transfer, gcash, maya, check
            $table->string('reference_number')->nullable();
            $table->string('status')->default('paid');               // paid, pending, partial, overdue
            $table->text('notes')->nullable();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rental_payments');
    }
};
