<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Order extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'supplier_id',
        'pr_number',
        'order_number',
        'order_type',
        'payment_method',
        'subtotal',
        'total',
        'status',
        'completed_at',
        'completed_by',
        'notes',           // optional: customer/admin notes
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'subtotal' => 'decimal:2',
        'total' => 'decimal:2',
        'completed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Default attribute values.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'pending',
    ];

    // ──────────────────────────────────────────────── Booted / Events

    protected static function booted()
    {
        static::creating(function ($order) {
            // Auto-generate order_number if not provided
            if (empty($order->order_number)) {
                $order->order_number = static::generateUniqueOrderNumber();
            }
        });
    }

    /**
     * Generate a unique order number: ORD-YY-NNNNNN
     * e.g., ORD-26-000001
     */
    public static function generateUniqueOrderNumber(): string
    {
        $year = now()->format('y');
        $prefix = "ORD-{$year}-";

        $maxAttempts = 10;

        for ($i = 0; $i < $maxAttempts; $i++) {
            $random = str_pad(mt_rand(1, 999999), 6, '0', STR_PAD_LEFT);
            $candidate = $prefix.$random;

            if (! static::where('order_number', $candidate)->exists()) {
                return $candidate;
            }
        }

        // Fallback: use timestamp + random suffix
        return $prefix.now()->format('His').Str::random(4);
    }

    // ──────────────────────────────────────────────── Relationships

    /**
     * The user who placed this order.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The supplier this order is for.
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * All items in this order.
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    // ──────────────────────────────────────────────── Accessors

    /**
     * Formatted subtotal (e.g. ₱1,234.00)
     */
    public function getFormattedSubtotalAttribute(): string
    {
        return '₱'.number_format($this->subtotal, 2);
    }

    /**
     * Formatted total (e.g. ₱1,234.00)
     */
    public function getFormattedTotalAttribute(): string
    {
        return '₱'.number_format($this->total, 2);
    }

    /**
     * Human-readable status label (capitalized)
     */
    public function getStatusLabelAttribute(): string
    {
        return ucfirst(str_replace('_', ' ', $this->status));
    }

    /**
     * Status badge variant for UI (success, warning, danger, etc.)
     */
    public function getStatusVariantAttribute(): string
    {
        $map = [
            'pending' => 'warning',
            'confirmed' => 'info',
            'processing' => 'primary',
            'shipped' => 'purple',
            'delivered' => 'success',
            'cancelled' => 'destructive',
            'refunded' => 'secondary',
        ];

        return $map[$this->status] ?? 'secondary';
    }

    // ──────────────────────────────────────────────── Helper Methods

    /**
     * Check if order is in pending status.
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if order can still be cancelled (e.g. not shipped/delivered).
     */
    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['pending', 'confirmed']);
    }

    /**
     * Calculate item count.
     */
    public function getItemCountAttribute(): int
    {
        return $this->items()->count();
    }

    // ──────────────────────────────────────────────── Scopes (optional)

    /**
     * Scope: Pending orders only.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope: Orders for a specific user.
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope: Orders for a specific supplier.
     */
    public function scopeForSupplier($query, $supplierId)
    {
        return $query->where('supplier_id', $supplierId);
    }
}
