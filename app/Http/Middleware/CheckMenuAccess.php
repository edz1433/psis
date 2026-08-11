<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckMenuAccess
{
    public function handle(Request $request, Closure $next, string $menuId): Response
    {
        $user = Auth::user();

        if (! $user) {
            // Not logged in → redirect to login
            return redirect()->route('login');
        }

        if ((string) $user->role === '1') {
            return $next($request);
        }

        $access = array_map('strval', $user->access ?? []);

        if (! in_array((string) $menuId, $access, true)) {
            // No permission → show 403 or redirect with message
            abort(403, 'You do not have access to this page.');

            // Alternative: redirect with flash message
            // return redirect()->route('dashboard')
            //     ->with('error', 'You do not have permission to access this page.');
        }

        return $next($request);
    }
}
