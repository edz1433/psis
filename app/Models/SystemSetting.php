<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class SystemSetting extends Model
{
    protected $fillable = [
        'system_name',
        'institution_name',
        'institution_address',
        'logo_path',
    ];

    public const DEFAULT_SYSTEM_NAME = 'PSIS';

    public const DEFAULT_INSTITUTION_NAME = 'Central Philippines State University';

    public const DEFAULT_INSTITUTION_ADDRESS = 'Camingawan, Kabankalan City, Negros Occidental';

    public static function current(): self
    {
        if (! Schema::hasTable('system_settings')) {
            return new self([
                'system_name' => self::DEFAULT_SYSTEM_NAME,
                'institution_name' => self::DEFAULT_INSTITUTION_NAME,
                'institution_address' => self::DEFAULT_INSTITUTION_ADDRESS,
            ]);
        }

        return self::query()->firstOrCreate([], [
            'system_name' => self::DEFAULT_SYSTEM_NAME,
            'institution_name' => self::DEFAULT_INSTITUTION_NAME,
            'institution_address' => self::DEFAULT_INSTITUTION_ADDRESS,
        ]);
    }

    public function logoUrl(): ?string
    {
        return $this->logo_path ? '/storage/'.ltrim($this->logo_path, '/') : null;
    }

    public function logoAbsolutePath(): ?string
    {
        if (! $this->logo_path || ! Storage::disk('public')->exists($this->logo_path)) {
            return null;
        }

        return Storage::disk('public')->path($this->logo_path);
    }

    public function logoDataUri(): ?string
    {
        $path = $this->logoAbsolutePath();

        if (! $path) {
            return null;
        }

        $mime = mime_content_type($path) ?: 'image/png';

        return 'data:'.$mime.';base64,'.base64_encode(file_get_contents($path));
    }
}
