<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * Display a listing of the categories.
     */
    public function index(): Response
    {
        $categories = Category::query()
            ->withCount('products')
            ->latest()
            ->get();

        return Inertia::render('Category/Index', [
            'categories' => $categories,
        ]);
    }

    /**
     * Store a newly created category in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
            'slug' => 'nullable|string|max:255|unique:categories,slug',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'nullable|boolean',
        ], [
            'name.required' => 'Please enter a category name.',
            'name.max' => 'Name cannot be longer than 255 characters.',
            'name.unique' => 'A category with this name already exists.',
            'slug.unique' => 'This slug is already taken.',
        ]);

        $category = Category::create([
            'name' => trim($validated['name']),
            'slug' => $validated['slug']
                ? Str::slug($validated['slug'])
                : Str::slug($validated['name']),
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        // Log creation
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'category_created',
            'subject_type' => Category::class,
            'subject_id' => $category->id,
            'properties' => [
                'name' => $category->name,
                'slug' => $category->slug,
                'description' => $category->description,
                'is_active' => $category->is_active,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'method' => $request->method(),
                'url' => $request->fullUrl(),
            ],
        ]);

        return back()->with('message', [
            'type' => 'success',
            'text' => 'Category created successfully.',
        ]);
    }

    /**
     * Update the specified category in storage.
     */
    public function update(Request $request, Category $category): RedirectResponse
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('categories', 'name')->ignore($category->id),
            ],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('categories', 'slug')->ignore($category->id),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'name.required' => 'Please enter a category name.',
            'name.max' => 'Name cannot be longer than 255 characters.',
            'name.unique' => 'A category with this name already exists.',
            'slug.unique' => 'This slug is already taken.',
        ]);

        // Prepare update data
        $updateData = [
            'name' => trim($validated['name']),
            'slug' => $validated['slug']
                ? Str::slug($validated['slug'])
                : Str::slug($validated['name']),
            'description' => $validated['description'] ?? $category->description,
            'is_active' => $validated['is_active'] ?? $category->is_active,
        ];

        // Get old values for comparison
        $oldData = $category->only([
            'name',
            'slug',
            'description',
            'is_active',
        ]);

        // Detect changes (simple assoc diff - all values are scalar here)
        $changes = array_diff_assoc($updateData, $oldData);

        if (! empty($changes)) {
            $category->update($updateData);

            // Log update only when something actually changed
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'category_updated',
                'subject_type' => Category::class,
                'subject_id' => $category->id,
                'properties' => [
                    'old_data' => $oldData,
                    'new_data' => $updateData,
                    'changed_fields' => array_keys($changes),
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'method' => $request->method(),
                    'url' => $request->fullUrl(),
                ],
            ]);
        }

        return back()->with('message', [
            'type' => 'success',
            'text' => 'Category updated successfully.',
        ]);
    }

    /**
     * Remove the specified category from storage.
     */
    public function destroy(Request $request, Category $category): RedirectResponse
    {
        if ($category->products()->exists()) {
            throw ValidationException::withMessages([
                'error' => 'Cannot delete this category because one or more products are still assigned to it.',
            ]);
        }

        // Capture data before deletion
        $oldData = $category->only([
            'name',
            'slug',
            'description',
            'is_active',
        ]);

        // Log deletion
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'category_deleted',
            'subject_type' => Category::class,
            'subject_id' => $category->id,
            'properties' => [
                'deleted_category' => $category->name,
                'old_data' => $oldData,
                'reason' => $request->input('reason', 'No reason provided'),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'method' => $request->method(),
                'url' => $request->fullUrl(),
            ],
        ]);

        $category->delete();

        return back()->with('message', [
            'type' => 'success',
            'text' => 'Category deleted successfully.',
        ]);
    }
}
