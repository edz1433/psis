<?php

namespace App\Http\Middleware;

use App\Helpers\MenuHelper;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */

    /**
     * Shares data with all Inertia pages.
     */
    public function share(Request $request): array
    {
        $user = Auth::user();
        $systemSettings = SystemSetting::current();
        $isAdmin = (string) $user?->role === '1';
        $access = $user
            ? ($isAdmin ? MenuHelper::ids() : array_map('strval', $user->access ?? []))
            : [];
        $authUser = null;

        if ($user) {
            $authUser = $user->load([
                'supplier:id,name,phone,address,contact_person',
            ])->only([
                'id',
                'fname',
                'lname',
                'username',
                'name',
                'email',
                'role',
                'supplier_id',
                'access',
                'supplier',
                'created_at',
            ]);

            $authUser['role'] = (string) $user->role;
            $authUser['access'] = $access;
        }

        return array_merge(parent::share($request), [
            'name' => $systemSettings->system_name,
            'system' => [
                'name' => $systemSettings->system_name,
                'institution_name' => $systemSettings->institution_name,
                'institution_address' => $systemSettings->institution_address,
                'logo_url' => $systemSettings->logoUrl(),
            ],

            'auth' => [
                'user' => $authUser,

                'isAuthenticated' => Auth::check(),
            ],

            // Helpful frontend shortcuts
            'user' => [
                'isAdmin' => $isAdmin,
                'isSupplier' => ! $isAdmin && $user?->supplier_id !== null,
                'supplierName' => $user?->supplier?->name ?? null,
                'supplierPhone' => $user?->supplier?->phone ?? null,
            ],

            // Flash messages (good for toast notifications)
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
                'message' => session('message'),
            ],

            // Ziggy route helper
            'ziggy' => [
                'location' => $request->url(),
            ],
        ]);
    }
}
