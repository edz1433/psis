<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RentalUnit extends Model
{
    protected $table = 'rental_units';

    protected $fillable = [
        'property_id',
        'name',
        'floor_level',
        'capacity',
        'status',
        'notes',
    ];

    protected $casts = [
        'capacity' => 'integer',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(RentalProperty::class, 'property_id');
    }

    public function tenants(): HasMany
    {
        return $this->hasMany(RentalTenant::class, 'room_unit_id');
    }

    public function activeTenants(): HasMany
    {
        return $this->hasMany(RentalTenant::class, 'room_unit_id')->where('status', 'active');
    }
}
