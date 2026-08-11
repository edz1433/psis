<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $products = DB::table('products')
            ->whereNotNull('supplier_id')
            ->where('stock', '>', 0)
            ->get(['id', 'supplier_id', 'stock']);

        foreach ($products as $product) {
            DB::table('product_stocks')->insert([
                'product_id' => $product->id,
                'supplier_id' => $product->supplier_id,
                'stock' => $product->stock,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Optional: log how many rows were migrated
        $count = count($products);
        if ($count > 0) {
            echo "Migrated $count stock records from products table.\n";
        }
    }

    public function down(): void
    {
        DB::table('product_stocks')->truncate();
    }
};
