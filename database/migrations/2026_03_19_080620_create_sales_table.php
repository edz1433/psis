<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');           // cashier who made the sale
            $table->foreignId('supplier_id')->constrained()->onDelete('cascade');       // which store/supplier sold it
            $table->string('receipt_number')->unique();                                 // e.g. POS-20260319-0001
            $table->decimal('subtotal', 12, 2)->default(0.00);                          // before discount
            $table->decimal('discount_percent', 5, 2)->default(0.00);                   // e.g. 10.00 for 10%
            $table->decimal('discount_amount', 12, 2)->default(0.00);                   // calculated amount
            $table->decimal('total', 12, 2);                                            // final amount after discount
            $table->string('payment_method');                                           // cash, gcash, card
            $table->decimal('payment_amount', 12, 2)->nullable();                       // amount received (tender)
            $table->decimal('change', 12, 2)->default(0.00);                            // change due
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();                               // optional extra field
            $table->string('status')->default('completed');                             // completed, voided, refund-pending, etc.
            $table->text('notes')->nullable();                                          // fallback / extra info
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
