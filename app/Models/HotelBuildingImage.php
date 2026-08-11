<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HotelBuildingImage extends Model
{
    protected $fillable = ['hotel_building_id', 'path', 'original_name', 'sort_order', 'is_primary'];

    protected $casts = ['is_primary' => 'boolean'];

    protected $appends = ['url'];

    public function building(): BelongsTo
    {
        return $this->belongsTo(HotelBuilding::class, 'hotel_building_id');
    }

    public function getUrlAttribute(): string
    {
        if (str_starts_with($this->path, 'http') || str_starts_with($this->path, '/')) {
            return $this->path;
        }

        if (file_exists(public_path($this->path))) {
            return ltrim($this->path, '/');
        }

        if (file_exists(storage_path('app/public/'.ltrim($this->path, '/')))) {
            return 'storage/'.ltrim($this->path, '/');
        }

        return 'building/building-1.avif';
    }
}
