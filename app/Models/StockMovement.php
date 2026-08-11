<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    public const TYPES = [
        'restock',
        'damaged',
        'expired',
        'transfer',
        'correction_add',
        'correction_deduct',
    ];

    protected $fillable = [
        'product_stock_id',
        'product_id',
        'supplier_id',
        'destination_supplier_id',
        'user_id',
        'type',
        'quantity',
        'stock_before',
        'stock_after',
        'reference_no',
        'remarks',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'stock_before' => 'integer',
        'stock_after' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function productStock(): BelongsTo
    {
        return $this->belongsTo(ProductStock::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function destinationSupplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'destination_supplier_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
