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
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();

            // Foreign keys
            $table->foreignId('order_id')
                ->constrained('orders')
                ->onDelete('cascade'); // delete items if order is deleted

            $table->foreignId('product_id')
                ->constrained('products')
                ->onDelete('restrict'); // prevent deleting product if used in orders

            // Core fields from your model
            $table->integer('quantity')->default(1);
            $table->decimal('price', 12, 2);     // unit price at time of order
            $table->decimal('total', 12, 2);     // quantity × price (stored for performance)

            // Recommended additional fields (optional but very useful)
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);

            $table->timestamps();

            // Indexes for performance
            $table->index('order_id');
            $table->index('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
