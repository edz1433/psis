<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HotelRoomPricing extends Model
{
    protected $fillable = [
        'hotel_room_id',
        'base_price',
        'price_type',
        'weekend_price',
        'holiday_price',
        'extra_adult_price',
        'extra_child_price',
        'child_age_rule',
        'security_deposit',
        'cleaning_fee',
        'other_fees',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'weekend_price' => 'decimal:2',
        'holiday_price' => 'decimal:2',
        'extra_adult_price' => 'decimal:2',
        'extra_child_price' => 'decimal:2',
        'security_deposit' => 'decimal:2',
        'cleaning_fee' => 'decimal:2',
        'other_fees' => 'array',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(HotelRoom::class, 'hotel_room_id');
    }
}
