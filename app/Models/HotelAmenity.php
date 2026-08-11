<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class HotelAmenity extends Model
{
    protected $fillable = ['name', 'description', 'status'];

    public function rooms(): BelongsToMany
    {
        return $this->belongsToMany(HotelRoom::class, 'hotel_room_amenity');
    }
}
