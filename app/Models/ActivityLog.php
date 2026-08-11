<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'subject_type',
        'subject_id',
        'properties',
        'ip_address',
        'user_agent',
        'method',
        'url',
    ];

    protected $casts = [
        'properties' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime', // ← usually good to cast
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function getDescriptionAttribute(): string
    {
        // Prefer description from properties if available
        if (isset($this->properties['description'])) {
            return (string) $this->properties['description'];
        }

        // Fallback: make action more readable
        $action = str_replace('_', ' ', $this->action ?? 'unknown');

        return ucfirst($action);
    }
}
