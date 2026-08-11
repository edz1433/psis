<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'fname')) {
                $table->string('fname')->nullable()->after('id');
            }

            if (! Schema::hasColumn('users', 'lname')) {
                $table->string('lname')->nullable()->after('fname');
            }

            if (! Schema::hasColumn('users', 'username')) {
                $table->string('username')->nullable()->unique()->after('lname');
            }

            if (! Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('1')->after('password');
            }

            if (! Schema::hasColumn('users', 'supplier_id')) {
                $table->unsignedBigInteger('supplier_id')->nullable()->index()->after('role');
            }

            if (! Schema::hasColumn('users', 'access')) {
                $table->json('access')->nullable()->after('supplier_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'access')) {
                $table->enum('access', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])->nullable()->change();
            }
        });
    }
};
