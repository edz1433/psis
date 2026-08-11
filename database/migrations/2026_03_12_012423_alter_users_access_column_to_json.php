<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Change from ENUM to JSON
            $table->json('access')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Revert to ENUM if needed (careful with data loss)
            $table->enum('access', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])->nullable()->change();
        });
    }
};
