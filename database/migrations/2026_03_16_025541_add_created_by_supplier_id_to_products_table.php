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
        Schema::table('products', function (Blueprint $table) {
            // Add the new column after 'category_id' (or adjust position as needed)
            $table->foreignId('created_by_supplier_id')
                ->nullable()
                ->constrained('suppliers')           // references suppliers.id
                ->onDelete('set null')               // if supplier is deleted → null
                ->after('category_id')               // keep logical order
                ->comment('The supplier who originally created/added this product');

            // Optional: index for faster queries (highly recommended)
            $table->index('created_by_supplier_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Drop foreign key constraint first
            $table->dropForeign(['created_by_supplier_id']);

            // Then drop the column
            $table->dropColumn('created_by_supplier_id');
        });
    }
};
