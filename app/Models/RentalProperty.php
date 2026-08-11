<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RentalProperty extends Model
{
    protected $table = 'rental_properties';

    protected $fillable = [
        'name',
        'type',
        'has_rooms_units',
        'address',
        'description',
        'monthly_rate',
        'floor_area',
        'total_units',
        'status',
        'amenities',
        'notes',
    ];

    protected $casts = [
        'monthly_rate' => 'decimal:2',
        'has_rooms_units' => 'boolean',
        'floor_area' => 'decimal:2',
        'total_units' => 'integer',
        'amenities' => 'array',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function tenants(): HasMany
    {
        return $this->hasMany(RentalTenant::class, 'property_id');
    }

    public function units(): HasMany
    {
        return $this->hasMany(RentalUnit::class, 'property_id');
    }

    public function activeTenants(): HasMany
    {
        return $this->hasMany(RentalTenant::class, 'property_id')->where('status', 'active');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(RentalPayment::class, 'property_id');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function getTypeOptions(): array
    {
        return ['dormitory', 'apartment_rental', 'boarding_house', 'commercial_space', 'stall', 'office_space', 'warehouse', 'house', 'other'];
    }

    public function getStatusOptions(): array
    {
        return ['available', 'occupied', 'reserved'];
    }
}
