<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HotelBooking extends Model
{
    protected $fillable = [
        'hotel_room_id',
        'hotel_facility_id',
        'hotel_room_package_id',
        'guest_name',
        'contact_number',
        'email',
        'check_in_at',
        'check_out_at',
        'adults',
        'children',
        'discount_amount',
        'additional_fees',
        'deposit_amount',
        'total_amount',
        'payment_status',
        'booking_status',
        'notes',
    ];

    protected $casts = [
        'check_in_at' => 'datetime',
        'check_out_at' => 'datetime',
        'adults' => 'integer',
        'children' => 'integer',
        'discount_amount' => 'decimal:2',
        'additional_fees' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(HotelRoom::class, 'hotel_room_id');
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(HotelFacility::class, 'hotel_facility_id');
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(HotelRoomPackage::class, 'hotel_room_package_id');
    }

    public function charges(): HasMany
    {
        return $this->hasMany(HotelBookingCharge::class);
    }

    public function scopeBlocking(Builder $query): Builder
    {
        return $query->whereIn('booking_status', ['pending', 'confirmed', 'checked-in']);
    }

    public function scopeOverlapping(Builder $query, string $checkIn, string $checkOut): Builder
    {
        return $query->where('check_in_at', '<', $checkOut)->where('check_out_at', '>', $checkIn);
    }
}
