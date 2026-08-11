<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RentalTenant extends Model
{
    protected $table = 'rental_tenants';

    protected $fillable = [
        'property_id',
        'room_unit_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'national_id',
        'address',
        'occupation',
        'emergency_contact_name',
        'emergency_contact_phone',
        'monthly_rent',
        'status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'monthly_rent' => 'decimal:2',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function property(): BelongsTo
    {
        return $this->belongsTo(RentalProperty::class, 'property_id');
    }

    public function roomUnit(): BelongsTo
    {
        return $this->belongsTo(RentalUnit::class, 'room_unit_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(RentalPayment::class, 'tenant_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
