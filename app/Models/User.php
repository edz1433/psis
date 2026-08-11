<?php

namespace App\Models;

use App\Helpers\MenuHelper;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'fname',
        'lname',
        'username',
        'email',
        'password',
        'role',
        'supplier_id',
        'access',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'role' => 'string',
        'access' => 'array',       // ["1","3","7"]
        'password' => 'hashed',
    ];

    // ----------------------------
    // Role Helpers
    // ----------------------------
    public function isAdmin(): bool
    {
        return $this->role === '1';
    }

    public function isProduction(): bool
    {
        return $this->role === '2';
    }

    public function isEnterprise(): bool
    {
        return $this->role === '3';
    }

    /**
     * Check if user has access to a specific menu by its numeric ID.
     */
    public function hasAccess(string|int $menuId): bool
    {
        return $this->isAdmin() || in_array((string) $menuId, array_map('strval', $this->access ?? []), true);
    }

    /**
     * Get human-readable labels of menus this user has access to.
     */
    public function getAccessibleMenus(): array
    {
        $allMenus = MenuHelper::all();

        if ($this->isAdmin()) {
            return $allMenus;
        }

        $userAccess = $this->access ?? [];

        return array_intersect_key($allMenus, array_flip($userAccess));
    }

    // --------------------------------------------------
    // Accessors
    // --------------------------------------------------

    public function getFullNameAttribute(): string
    {
        return trim("{$this->fname} {$this->lname}");
    }

    // --------------------------------------------------
    // Relationships
    // --------------------------------------------------

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function ownedProducts()
    {
        return $this->hasMany(Product::class, 'created_by');
    }

    public function inventory()
    {
        return $this->hasMany(Inventory::class, 'user_id');
    }

    public function sentRequisitions()
    {
        return $this->hasMany(Requisition::class, 'production_user_id');
    }

    public function receivedRequisitions()
    {
        return $this->hasMany(Requisition::class, 'enterprise_user_id');
    }

    public function issuedConsignments()
    {
        return $this->hasMany(ConsignmentStock::class, 'enterprise_user_id');
    }

    public function receivedConsignments()
    {
        return $this->hasMany(ConsignmentStock::class, 'production_user_id');
    }

    public function receivableBalances()
    {
        return $this->hasMany(ProductionBalance::class, 'enterprise_user_id');
    }

    public function payableBalances()
    {
        return $this->hasMany(ProductionBalance::class, 'production_user_id');
    }

    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class, 'user_id');
    }
}
