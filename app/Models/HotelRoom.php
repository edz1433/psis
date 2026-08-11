<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class HotelRoom extends Model
{
    protected $fillable = [
        'hotel_building_id',
        'name',
        'room_type',
        'floor_number',
        'description',
        'max_adult_capacity',
        'max_child_capacity',
        'base_capacity',
        'status',
        'rules_notes',
    ];

    protected $casts = [
        'max_adult_capacity' => 'integer',
        'max_child_capacity' => 'integer',
        'base_capacity' => 'integer',
    ];

    public function building(): BelongsTo
    {
        return $this->belongsTo(HotelBuilding::class, 'hotel_building_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(HotelRoomImage::class)->orderBy('sort_order');
    }

    public function pricing(): HasOne
    {
        return $this->hasOne(HotelRoomPricing::class);
    }

    public function packages(): HasMany
    {
        return $this->hasMany(HotelRoomPackage::class);
    }

    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(HotelAmenity::class, 'hotel_room_amenity');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(HotelBooking::class);
    }
}
