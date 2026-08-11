<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Campus extends Model
{
    use HasFactory;

    protected $fillable = [
        'campus_name',
        'campus_abbr',
    ];

    // A campus supplies many products
    public function products()
    {
        return $this->hasMany(Product::class);
    }

    // A campus receives many orders
    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
