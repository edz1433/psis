<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Copy data only for products that have supplier_id and stock > 0
        $oldStocks = DB::table('products')
            ->whereNotNull('supplier_id')
            ->where('stock', '>', 0)
            ->select('id as product_id', 'supplier_id', 'stock')
            ->get();

        foreach ($oldStocks as $row) {
            DB::table('product_stocks')->insert([
                'product_id' => $row->product_id,
                'supplier_id' => $row->supplier_id,
                'stock' => $row->stock,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('product_stocks')->truncate();
    }
};
