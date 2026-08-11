<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HotelRoomPackage extends Model
{
    protected $fillable = [
        'hotel_room_id',
        'hotel_facility_id',
        'name',
        'description',
        'included_adults',
        'included_children',
        'duration_value',
        'duration_unit',
        'price',
        'extra_adult_charge',
        'extra_child_charge',
        'inclusions',
        'status',
    ];

    protected $casts = [
        'included_adults' => 'integer',
        'included_children' => 'integer',
        'duration_value' => 'integer',
        'price' => 'decimal:2',
        'extra_adult_charge' => 'decimal:2',
        'extra_child_charge' => 'decimal:2',
        'inclusions' => 'array',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(HotelRoom::class, 'hotel_room_id');
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(HotelFacility::class, 'hotel_facility_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(HotelBooking::class);
    }
}
