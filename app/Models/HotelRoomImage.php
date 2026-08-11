<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HotelRoomImage extends Model
{
    protected $fillable = ['hotel_room_id', 'path', 'original_name', 'sort_order', 'is_primary'];

    protected $casts = ['is_primary' => 'boolean'];

    protected $appends = ['url'];

    public function room(): BelongsTo
    {
        return $this->belongsTo(HotelRoom::class, 'hotel_room_id');
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
