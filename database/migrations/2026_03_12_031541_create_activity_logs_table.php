<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();

            // Who performed the action
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null');           // keep log even if user is deleted

            // What happened
            $table->string('action');               // e.g. "user_deleted", "product_updated", "login_success"

            // Optional: more specific target
            $table->string('subject_type')->nullable();     // e.g. App\Models\User
            $table->unsignedBigInteger('subject_id')->nullable();

            // Rich context / changes
            $table->json('properties')->nullable();         // old/new values, IP, reason, etc.

            // Additional useful fields
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable(255);
            $table->string('method')->nullable();           // GET, POST, DELETE, etc.
            $table->string('url')->nullable();

            $table->timestamps();

            // Indexes for fast queries
            $table->index(['user_id']);
            $table->index(['subject_type', 'subject_id']);
            $table->index('action');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
