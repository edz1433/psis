<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HotelFacilityImage extends Model
{
    protected $fillable = ['hotel_facility_id', 'path', 'original_name', 'sort_order', 'is_primary'];

    protected $casts = ['is_primary' => 'boolean'];

    protected $appends = ['url'];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(HotelFacility::class, 'hotel_facility_id');
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

        return 'rooms/1.avif';
    }
}
