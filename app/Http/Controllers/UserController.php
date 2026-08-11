<?php

namespace App\Http\Controllers;

use App\Helpers\MenuHelper;
use App\Models\ActivityLog;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class UserController extends Controller
{
    public function index(): InertiaResponse
    {
        $users = User::with('supplier')
            ->latest('created_at')
            ->get();

        return Inertia::render('Users/Index', [
            'users' => $users,
            'suppliers' => Supplier::all(['id', 'name']),
            'menuEnums' => MenuHelper::all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'fname' => 'required|string|max:255',
            'lname' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username',
            'password' => 'required|string|min:6',
            'role' => 'required|integer|in:1,2,3',
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'access' => 'nullable|array',
            'access.*' => 'string|in:'.implode(',', MenuHelper::ids()),
        ], [
            'username.unique' => 'This username is already taken.',
            'username.required' => 'Please enter a username.',
            'password.required' => 'Please enter a password.',
            'password.min' => 'Password must be at least 6 characters.',
            'supplier_id.required' => 'Please select a supplier.',
            'supplier_id.exists' => 'Selected supplier does not exist.',
        ]);

        $user = User::create([
            'fname' => trim($validated['fname']),
            'lname' => trim($validated['lname']),
            'username' => trim($validated['username']),
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'supplier_id' => $validated['supplier_id'],
            'access' => $validated['access'] ?? [],
        ]);

        // Log creation
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'user_created',
            'subject_type' => get_class($user),
            'subject_id' => $user->id,
            'properties' => [
                'new_data' => $user->only([
                    'fname', 'lname', 'username', 'role', 'supplier_id', 'access',
                ]),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'method' => $request->method(),
                'url' => $request->fullUrl(),
            ],
        ]);

        return back()->with('message', [
            'type' => 'success',
            'text' => 'User created successfully!',
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'fname' => 'required|string|max:255',
            'lname' => 'required|string|max:255',
            'username' => [
                'required',
                'string',
                'max:255',
                Rule::unique('users', 'username')->ignore($user->id),
            ],
            'password' => 'nullable|string|min:6',
            'role' => 'required|integer|in:1,2,3',
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'access' => 'nullable|array',
            'access.*' => 'string|in:'.implode(',', MenuHelper::ids()),
        ], [
            'username.unique' => 'This username is already taken.',
            'username.required' => 'Please enter a username.',
            'password.min' => 'Password must be at least 6 characters.',
            'supplier_id.required' => 'Please select a supplier.',
            'supplier_id.exists' => 'Selected supplier does not exist.',
        ]);

        // Prepare clean update data
        $updateData = [
            'fname' => trim($validated['fname']),
            'lname' => trim($validated['lname']),
            'username' => trim($validated['username']),
            'role' => $validated['role'],
            'supplier_id' => $validated['supplier_id'],
            'access' => $validated['access'] ?? $user->access ?? [],
        ];

        // Optional password update
        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        // Get old values for comparison (only fields we care about)
        $oldData = $user->only([
            'fname',
            'lname',
            'username',
            'role',
            'supplier_id',
            'access',
        ]);

        // ────────────────────────────────────────────────
        // Compare changes safely
        // ────────────────────────────────────────────────

        // 1. Scalar fields (easy direct comparison)
        $scalarFields = ['fname', 'lname', 'username', 'role', 'supplier_id'];
        $scalarOld = array_intersect_key($oldData, array_flip($scalarFields));
        $scalarNew = array_intersect_key($updateData, array_flip($scalarFields));
        $scalarChanges = array_diff_assoc($scalarNew, $scalarOld);

        // 2. Access array (order-insensitive comparison)
        $accessOld = $oldData['access'] ?? [];
        $accessNew = $updateData['access'] ?? [];

        // Sort both arrays to ignore order differences
        sort($accessOld);
        sort($accessNew);

        $accessChanged = $accessOld !== $accessNew;

        // Combine all changes
        $changedFields = array_keys($scalarChanges);
        if ($accessChanged) {
            $changedFields[] = 'access';
        }

        // Only proceed with update & log if something actually changed
        if (! empty($changedFields)) {
            // Perform the update
            $user->update($updateData);

            // Log the change
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'user_updated',
                'subject_type' => get_class($user),
                'subject_id' => $user->id,
                'properties' => [
                    'old_data' => $oldData,
                    'new_data' => $updateData,
                    'changed_fields' => $changedFields,
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'method' => $request->method(),
                    'url' => $request->fullUrl(),
                ],
            ]);
        }

        return back()->with('message', [
            'type' => 'success',
            'text' => 'User updated successfully!',
        ]);
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        // Prevent self-deletion
        if (auth()->id() === $user->id) {
            throw ValidationException::withMessages([
                'error' => 'You cannot delete your own account.',
            ]);
        }

        // Capture snapshot of user data before deletion
        $oldData = $user->only([
            'fname',
            'lname',
            'username',
            'role',
            'supplier_id',
            'access',
        ]);

        // Log the deletion (before actually deleting the record)
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'user_deleted',
            'subject_type' => get_class($user),
            'subject_id' => $user->id,
            'properties' => [
                'deleted_user' => trim("{$user->fname} {$user->lname}"),
                'old_data' => $oldData,
                'reason' => $request->input('reason', 'No reason provided'),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'method' => $request->method(),
                'url' => $request->fullUrl(),
            ],
        ]);

        // Perform the soft or hard delete
        $user->delete();

        return back()->with('message', [
            'type' => 'success',
            'text' => 'User deleted successfully!',
        ]);
    }
}
