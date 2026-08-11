<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     * ── price removed (now lives in ProductStock)
     */
    protected $fillable = [
        'barcode',
        'name',
        'category_id',
        'created_by_supplier_id',
        'product_img',
        // stock, supplier_id and price are no longer columns here
    ];

    // ──────────────────────────────────────────────── Relationships

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function stocks(): HasMany
    {
        return $this->hasMany(ProductStock::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    // ──────────────────────────────────────────────── Stock Accessors (unchanged)

    public function getStockAttribute(): int
    {
        return (int) $this->stocks()->sum('stock');
    }

    public function getFormattedStockAttribute(): string
    {
        return number_format($this->stock);
    }

    public function getIsInStockAttribute(): bool
    {
        return $this->stock > 0;
    }

    public function getIsLowStockAttribute(): bool
    {
        $total = $this->stock;

        return $total > 0 && $total <= 5;
    }

    public function getStockStatusAttribute(): string
    {
        if ($this->stock <= 0) {
            return 'Out of Stock';
        }
        if ($this->is_low_stock) {
            return 'Low Stock';
        }

        return 'In Stock';
    }

    public function getStockForSupplier(int $supplierId): int
    {
        return (int) $this->stocks()
            ->where('supplier_id', $supplierId)
            ->value('stock') ?? 0;
    }

    public function getSupplierAttribute()
    {
        return $this->stocks()->with('supplier')->first()?->supplier;
    }

    public function getTotalStockAttribute(): int
    {
        return (int) $this->stocks()->sum('stock');
    }

    // ──────────────────────────────────────────────── New Pricing Accessors
    // (added because price is no longer a column on Product)

    /**
     * Get the "main" selling price for this product.
     * Strategy: price from the oldest/first stock entry (common default)
     * You can change this logic later (lowest price, default supplier, etc.)
     */
    public function getPriceAttribute(): float
    {
        return (float) $this->stocks()->oldestOfMany()->value('price') ?? 0.00;
    }

    public function getFormattedPriceAttribute(): string
    {
        return number_format($this->price, 2);
    }

    /**
     * Get the lowest available price across all suppliers
     */
    public function getLowestPriceAttribute(): float
    {
        return (float) $this->stocks()->min('price') ?? 0.00;
    }

    public function getFormattedLowestPriceAttribute(): string
    {
        return number_format($this->lowest_price, 2);
    }

    /**
     * Get the capital (cost) price from the main/default stock entry
     */
    public function getCapitalAttribute(): float
    {
        return (float) $this->stocks()->oldestOfMany()->value('capital') ?? 0.00;
    }

    /**
     * Get the average markup percentage across available stocks
     */
    public function getAverageMarkupAttribute(): float
    {
        return (float) $this->stocks()->avg('markup') ?? 0.00;
    }
}
