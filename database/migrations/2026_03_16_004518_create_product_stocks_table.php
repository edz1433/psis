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
        Schema::create('product_stocks', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')
                ->constrained()
                ->onDelete('cascade');

            $table->foreignId('supplier_id')
                ->constrained()
                ->onDelete('restrict');

            // Main stock field
            $table->unsignedInteger('stock')->default(0);

            // Optional audit field (who last updated the stock)
            $table->foreignId('updated_by')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null');

            $table->timestamps();

            // Prevent duplicate stock entries for the same product-supplier pair
            $table->unique(['product_id', 'supplier_id'], 'product_supplier_unique');

            // Performance indexes
            $table->index('product_id');
            $table->index('supplier_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_stocks');
    }
};
