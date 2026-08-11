<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'order_items';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'order_id',
        'product_id',
        'quantity',
        'price',           // unit price at time of order
        'total',           // quantity × price (stored for performance & history)
        'discount_amount',
        'tax_amount',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'price' => 'decimal:2',
        'total' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'quantity' => 'integer',
    ];

    /**
     * Default attribute values.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'quantity' => 1,
        'discount_amount' => 0.00,
        'tax_amount' => 0.00,
    ];

    // ──────────────────────────────────────────────── Relationships

    /**
     * The order this item belongs to.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * The product this item refers to.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    // ──────────────────────────────────────────────── Accessors

    /**
     * Get the subtotal (quantity × price) – uses stored total if available.
     */
    public function getSubtotalAttribute(): float
    {
        return (float) ($this->total ?? $this->quantity * $this->price);
    }

    /**
     * Formatted unit price (e.g. ₱75.00)
     */
    public function getFormattedPriceAttribute(): string
    {
        return '₱'.number_format($this->price, 2);
    }

    /**
     * Formatted subtotal/total (e.g. ₱150.00)
     */
    public function getFormattedTotalAttribute(): string
    {
        return '₱'.number_format($this->subtotal, 2);
    }

    /**
     * Formatted discount amount
     */
    public function getFormattedDiscountAttribute(): string
    {
        return $this->discount_amount > 0 ? '₱'.number_format($this->discount_amount, 2) : '-';
    }

    /**
     * Formatted tax amount
     */
    public function getFormattedTaxAttribute(): string
    {
        return $this->tax_amount > 0 ? '₱'.number_format($this->tax_amount, 2) : '-';
    }

    // ──────────────────────────────────────────────── Mutators (optional)

    /**
     * Auto-calculate total before saving (if not provided)
     */
    public function setTotalAttribute($value)
    {
        if (is_null($value)) {
            $this->attributes['total'] = $this->quantity * $this->price;
        } else {
            $this->attributes['total'] = $value;
        }
    }
}
