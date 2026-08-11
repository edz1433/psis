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
        // Add new pricing fields to product_stocks (per supplier)
        Schema::table('product_stocks', function (Blueprint $table) {
            $table->decimal('capital', 10, 2)->default(0)->after('stock');
            $table->decimal('markup', 5, 2)->default(0)->after('capital');   // markup percentage (e.g. 30.00)
            $table->decimal('price', 10, 2)->default(0)->after('markup');
        });

        // Remove the old price column from products table
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove the new columns from product_stocks
        Schema::table('product_stocks', function (Blueprint $table) {
            $table->dropColumn(['capital', 'markup', 'price']);
        });

        // Restore the price column in products table
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('price', 10, 2)->default(0);
        });
    }
};
