<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Drop foreign key first
            $table->dropForeign(['supplier_id']);

            // Drop columns
            $table->dropColumn(['supplier_id', 'stock']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('supplier_id')
                ->nullable()
                ->constrained()
                ->onDelete('set null')
                ->after('category_id');

            $table->unsignedInteger('stock')
                ->default(0)
                ->after('price');
        });
    }
};
