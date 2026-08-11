<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\SystemSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SystemSettingController extends Controller
{
    public function index(): Response
    {
        $settings = SystemSetting::current();

        return Inertia::render('Settings/Index', [
            'settings' => [
                'system_name' => $settings->system_name,
                'institution_name' => $settings->institution_name,
                'institution_address' => $settings->institution_address,
                'logo_path' => $settings->logo_path,
                'logo_url' => $settings->logoUrl(),
            ],
            'title' => 'System Settings',
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'system_name' => ['required', 'string', 'max:120'],
            'institution_name' => ['required', 'string', 'max:180'],
            'institution_address' => ['nullable', 'string', 'max:500'],
            'logo' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
        ], [
            'system_name.required' => 'System name is required.',
            'institution_name.required' => 'Institution name is required.',
            'logo.image' => 'Logo must be an image file.',
            'logo.max' => 'Logo must not be larger than 2MB.',
        ]);

        $settings = SystemSetting::current();
        $oldData = $settings->only(['system_name', 'institution_name', 'institution_address', 'logo_path']);

        $settings->system_name = trim($validated['system_name']);
        $settings->institution_name = trim($validated['institution_name']);
        $settings->institution_address = isset($validated['institution_address'])
            ? trim($validated['institution_address'])
            : null;

        if ($request->hasFile('logo')) {
            if ($settings->logo_path) {
                Storage::disk('public')->delete($settings->logo_path);
            }

            $settings->logo_path = $request->file('logo')->store('system', 'public');
        }

        $settings->save();

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'system_settings_updated',
            'subject_type' => SystemSetting::class,
            'subject_id' => $settings->id,
            'properties' => [
                'old_data' => $oldData,
                'new_data' => $settings->only(['system_name', 'institution_name', 'institution_address', 'logo_path']),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return back()->with('message', [
            'type' => 'success',
            'text' => 'System settings updated successfully.',
        ]);
    }
}
