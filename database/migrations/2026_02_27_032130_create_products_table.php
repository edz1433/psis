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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');

            $table->decimal('price', 10, 2);

            $table->integer('stock')->default(0);

            // Supplier is now REQUIRED (not nullable)
            $table->foreignId('supplier_id')
                ->constrained('suppliers')           // explicit table name
                ->onDelete('cascade')                // delete product if supplier is deleted
                ->onUpdate('cascade');

            // Category is now REQUIRED (not nullable)
            $table->foreignId('category_id')
                ->constrained('categories')          // explicit table name
                ->onDelete('cascade')                // delete product if category is deleted
                ->onUpdate('cascade');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
