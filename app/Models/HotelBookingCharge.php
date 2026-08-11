<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HotelBookingCharge extends Model
{
    protected $fillable = ['hotel_booking_id', 'label', 'type', 'quantity', 'unit_amount', 'amount', 'meta'];

    protected $casts = [
        'quantity' => 'integer',
        'unit_amount' => 'decimal:2',
        'amount' => 'decimal:2',
        'meta' => 'array',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(HotelBooking::class, 'hotel_booking_id');
    }
}
