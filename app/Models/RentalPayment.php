<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RentalPayment extends Model
{
    protected $table = 'rental_payments';

    protected $fillable = [
        'tenant_id',
        'property_id',
        'room_unit_id',
        'billing_month',
        'monthly_rent_amount',
        'previous_balance',
        'amount',
        'paid_amount',
        'payment_date',
        'due_date',
        'period_start',
        'period_end',
        'payment_method',
        'reference_number',
        'status',
        'notes',
        'received_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'monthly_rent_amount' => 'decimal:2',
        'previous_balance' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'payment_date' => 'date',
        'due_date' => 'date',
        'period_start' => 'date',
        'period_end' => 'date',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(RentalTenant::class, 'tenant_id');
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(RentalProperty::class, 'property_id');
    }

    public function roomUnit(): BelongsTo
    {
        return $this->belongsTo(RentalUnit::class, 'room_unit_id');
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}
