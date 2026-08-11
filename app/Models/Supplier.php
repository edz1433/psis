<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'is_campus',
        'phone',
        'address',
        'contact_person',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_campus' => 'boolean',
    ];

    // ──────────────────────────────────────────────── Relationships

    /**
     * Get all products that this supplier provides stock for.
     * (via the product_stocks pivot table)
     */
    public function products()
    {
        return $this->hasManyThrough(
            Product::class,
            ProductStock::class,
            'supplier_id',     // foreign key on product_stocks
            'id',              // foreign key on products
            'id',              // local key on suppliers
            'product_id'       // local key on product_stocks
        );
    }

    /**
     * Get all stock records managed by this supplier.
     */
    public function stocks(): HasMany
    {
        return $this->hasMany(ProductStock::class);
    }

    /**
     * Get all orders placed with this supplier.
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    // ──────────────────────────────────────────────── Helpers / Scopes

    /**
     * Check if this supplier is a campus supplier.
     */
    public function isCampus(): bool
    {
        return (bool) $this->is_campus;
    }

    /**
     * Scope: Only campus suppliers.
     */
    public function scopeCampus($query)
    {
        return $query->where('is_campus', true);
    }

    /**
     * Scope: Only non-campus suppliers.
     */
    public function scopeNonCampus($query)
    {
        return $query->where('is_campus', false);
    }

    /**
     * Get total stock quantity managed by this supplier across all products.
     */
    public function getTotalStockAttribute(): int
    {
        return (int) $this->stocks()->sum('stock');
    }

    /**
     * Formatted total stock (with commas).
     */
    public function getFormattedTotalStockAttribute(): string
    {
        return number_format($this->total_stock);
    }
}
