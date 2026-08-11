<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductStock extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'product_stocks';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'product_id',
        'supplier_id',
        'stock',
        'capital',   // added
        'markup',    // added
        'price',     // added
        'updated_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'stock' => 'integer',
        'capital' => 'decimal:2',   // added
        'markup' => 'decimal:2',   // added
        'price' => 'decimal:2',   // added
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Default attribute values.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'stock' => 0,
        'capital' => 0.00,   // added
        'markup' => 0.00,   // added
        'price' => 0.00,   // added
    ];

    // ──────────────────────────────────────────────── Relationships

    /**
     * The product this stock entry belongs to.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * The supplier who provides this stock.
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * The user who last updated this stock entry (audit trail).
     */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // ──────────────────────────────────────────────── Scopes

    /**
     * Scope: Filter stock records for a specific supplier.
     */
    public function scopeForSupplier($query, $supplierId)
    {
        return $query->where('supplier_id', $supplierId);
    }

    /**
     * Scope: Filter stock records for a specific product.
     */
    public function scopeForProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }

    // ──────────────────────────────────────────────── Accessors

    /**
     * Formatted stock quantity (with commas).
     */
    public function getFormattedStockAttribute(): string
    {
        return number_format($this->stock);
    }

    /**
     * Whether this stock entry is low (positive but ≤ 5).
     */
    public function getIsLowStockAttribute(): bool
    {
        return $this->stock > 0 && $this->stock <= 5;
    }

    /**
     * Whether this stock entry is out of stock.
     */
    public function getIsOutOfStockAttribute(): bool
    {
        return $this->stock <= 0;
    }

    /**
     * Formatted status label for UI (e.g., "In Stock", "Low Stock", "Out of Stock").
     */
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

    protected static function booted(): void
    {
        static::saving(function (ProductStock $stock) {
            // Only calculate if both capital and markup are provided
            if (! is_null($stock->capital) && ! is_null($stock->markup)) {
                $stock->price = round(
                    $stock->capital * (1 + ($stock->markup / 100)),
                    2
                );
            }
        });
    }

    // ──────────────────────────────────────────────── Mutators (optional safety)

    /**
     * Ensure stock never goes negative.
     */
    public function setStockAttribute($value)
    {
        $this->attributes['stock'] = max(0, (int) $value);
    }
}
