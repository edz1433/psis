<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'supplier_id',
        'receipt_number',
        'total',
        'payment_method',
        'payment_amount',
        'change',
        'customer_name',
        'status',
        'notes',
    ];

    protected $casts = [
        'total' => 'decimal:2',
        'payment_amount' => 'decimal:2',
        'change' => 'decimal:2',
    ];

    // ==============================================
    // Relationships
    // ==============================================

    /**
     * The user who made this sale
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The supplier who owns this sale
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Items in this sale
     */
    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }
}
