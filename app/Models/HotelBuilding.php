<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HotelBuilding extends Model
{
    protected $fillable = ['name', 'description', 'location', 'status'];

    public function rooms(): HasMany
    {
        return $this->hasMany(HotelRoom::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(HotelBuildingImage::class)->orderBy('sort_order');
    }
}
