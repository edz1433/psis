<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HotelFacility extends Model
{
    protected $fillable = [
        'name',
        'facility_type',
        'location',
        'description',
        'max_adult_capacity',
        'max_child_capacity',
        'base_capacity',
        'status',
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
        'rules_notes',
    ];

    protected $casts = [
        'max_adult_capacity' => 'integer',
        'max_child_capacity' => 'integer',
        'base_capacity' => 'integer',
        'base_price' => 'decimal:2',
        'weekend_price' => 'decimal:2',
        'holiday_price' => 'decimal:2',
        'extra_adult_price' => 'decimal:2',
        'extra_child_price' => 'decimal:2',
        'security_deposit' => 'decimal:2',
        'cleaning_fee' => 'decimal:2',
        'other_fees' => 'array',
    ];

    public function images(): HasMany
    {
        return $this->hasMany(HotelFacilityImage::class)->orderBy('sort_order');
    }

    public function packages(): HasMany
    {
        return $this->hasMany(HotelRoomPackage::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(HotelBooking::class);
    }
}
