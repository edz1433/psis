<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('system_settings', 'institution_name')) {
                $table->string('institution_name')->default('Central Philippines State University')->after('system_name');
            }

            if (! Schema::hasColumn('system_settings', 'institution_address')) {
                $table->text('institution_address')->nullable()->after('institution_name');
            }
        });

        DB::table('system_settings')->updateOrInsert(
            ['id' => 1],
            [
                'system_name' => 'PSIS',
                'institution_name' => 'Central Philippines State University',
                'institution_address' => 'Camingawan, Kabankalan City, Negros Occidental',
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );
    }

    public function down(): void
    {
        Schema::table('system_settings', function (Blueprint $table) {
            if (Schema::hasColumn('system_settings', 'institution_name')) {
                $table->dropColumn('institution_name');
            }

            if (Schema::hasColumn('system_settings', 'institution_address')) {
                $table->dropColumn('institution_address');
            }
        });
    }
};
