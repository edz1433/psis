<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();
        $isAdmin = (int) $user->role === 1;
        $supplierId = $user->supplier_id;

        $query = Product::query()
            ->with(['category', 'stocks.supplier'])
            ->withCount('orderItems')
            ->latest();

        if (! $isAdmin) {
            if (! $supplierId) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereHas('stocks', function ($q) use ($supplierId) {
                    $q->where('supplier_id', $supplierId);
                });
            }
        }

        $products = $query->get()->map(function ($product) use ($isAdmin, $supplierId) {
            $myStockRecord = null;
            $myStock = 0;
            $myStockStatus = 'Out of Stock';
            $myPrice = 0.00;
            $myCapital = 0.00;
            $myIsLowStock = false;
            $myIsOutOfStock = true;

            if (! $isAdmin && $supplierId) {
                $myStockRecord = $product->stocks->firstWhere('supplier_id', $supplierId);
                if ($myStockRecord) {
                    $myStock = (int) $myStockRecord->stock;
                    $myStockStatus = $myStockRecord->stock_status;
                    $myPrice = (float) $myStockRecord->price;
                    $myCapital = (float) $myStockRecord->capital;
                    $myIsLowStock = $myStockRecord->is_low_stock;
                    $myIsOutOfStock = $myStockRecord->is_out_of_stock;
                }
            }

            $displayStockRecord = $myStockRecord ?? $product->stocks->first();
            $displaySupplier = $displayStockRecord?->supplier;
            $displayPrice = $displayStockRecord ? (float) $displayStockRecord->price : 0.00;
            $displayCapital = $displayStockRecord ? (float) $displayStockRecord->capital : 0.00;

            return [
                'id' => $product->id,
                'name' => $product->name,
                'barcode' => $product->barcode,
                'product_img' => $product->product_img
                    ? asset('storage/'.$product->product_img)
                    : null,

                'price' => $displayPrice,
                'formatted_price' => number_format($displayPrice, 2),
                'capital' => $displayCapital,
                'formatted_capital' => number_format($displayCapital, 2),

                'category' => $product->category ? [
                    'id' => $product->category->id,
                    'name' => $product->category->name,
                ] : null,

                'order_items_count' => $product->order_items_count,

                'my_stock' => $myStock,
                'my_stock_formatted' => number_format($myStock),
                'my_stock_status' => $myStockStatus,
                'my_price' => $myPrice,
                'my_formatted_price' => number_format($myPrice, 2),
                'my_capital' => $myCapital,
                'my_formatted_capital' => number_format($myCapital, 2),
                'my_is_low_stock' => $myIsLowStock,
                'my_is_out_of_stock' => $myIsOutOfStock,

                'global_stock' => $product->stock,
                'global_stock_formatted' => $product->formatted_stock,
                'global_stock_status' => $product->stock_status,
                'suppliers_count' => $product->stocks->count(),

                'display_supplier' => $displaySupplier ? [
                    'id' => $displaySupplier->id,
                    'name' => $displaySupplier->name,
                ] : null,

                'stocks' => $isAdmin ? $product->stocks->map(fn ($s) => [
                    'supplier_id' => $s->supplier_id,
                    'supplier_name' => $s->supplier?->name ?? 'Unknown',
                    'stock' => (int) $s->stock,
                    'capital' => (float) $s->capital,
                    'markup' => (float) $s->markup,
                    'price' => (float) $s->price,
                    'formatted_price' => number_format($s->price, 2),
                    'status' => $s->stock_status,
                ])->values() : null,
            ];
        })->values();

        return Inertia::render('Products/Index', [
            'products' => $products,
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'userRole' => (int) $user->role,
            'userSupplierId' => $supplierId,
            'isAdmin' => $isAdmin,
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name' => ['bail', 'required', 'string', 'max:255'],
            'barcode' => ['nullable', 'string', 'max:255', 'unique:products,barcode'],
            'product_img' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'],
            'category_id' => ['bail', 'required', 'exists:categories,id'],
            'supplier_id' => $user->role == 1 ? ['bail', 'required', 'exists:suppliers,id'] : ['nullable'],
            'stock' => ['bail', 'required', 'integer', 'min:0'],
            'capital' => ['bail', 'required', 'numeric', 'min:0'],
            'markup' => ['bail', 'required', 'numeric', 'min:0', 'max:500'],
        ]);

        $supplierId = $user->role == 1 ? $validated['supplier_id'] : $user->supplier_id;

        if (! $supplierId) {
            throw ValidationException::withMessages(['supplier_id' => 'No supplier associated with your account.']);
        }

        $product = DB::transaction(function () use ($validated, $supplierId, $request) {
            $barcode = $validated['barcode'] ?? $this->generateNextBarcode();

            $product = Product::create([
                'name' => trim($validated['name']),
                'barcode' => $barcode,
                'category_id' => $validated['category_id'],
            ]);

            if ($request->hasFile('product_img')) {
                if (! Storage::disk('public')->exists('products')) {
                    Storage::disk('public')->makeDirectory('products', 0755, true);
                }
                $path = $request->file('product_img')->store('products', 'public');
                $product->update(['product_img' => $path]);
            }

            ProductStock::create([
                'product_id' => $product->id,
                'supplier_id' => $supplierId,
                'stock' => $validated['stock'],
                'capital' => $validated['capital'],
                'markup' => $validated['markup'],
                'updated_by' => auth()->id(),
            ]);

            return $product;
        });

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'product_created',
            'subject_type' => Product::class,
            'subject_id' => $product->id,
            'properties' => [
                'name' => $product->name,
                'barcode' => $product->barcode,
                'product_img' => $product->product_img,
                'category_id' => $product->category_id,
                'supplier_id' => $supplierId,
                'stock' => $validated['stock'],
                'capital' => $validated['capital'],
                'markup' => $validated['markup'],
            ],
        ]);

        return back()->with('message', ['type' => 'success', 'text' => 'Product created successfully.']);
    }

    public function update(Request $request, Product $product)
    {
        $user = Auth::user();

        // Permission check
        if ((int) $user->role !== 1) {
            $hasAccess = $product->stocks()
                ->where('supplier_id', $user->supplier_id)
                ->exists();

            if (! $hasAccess) {
                abort(403, 'You do not have permission to edit this product.');
            }
        }

        // Validation
        $validated = $request->validate([
            'name' => ['bail', 'required', 'string', 'max:255'],
            'barcode' => ['nullable', 'string', 'max:255'],
            'product_img' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'],
            'category_id' => ['bail', 'required', 'exists:categories,id'],
            'supplier_id' => (int) $user->role === 1
                ? ['bail', 'required', 'exists:suppliers,id']
                : ['nullable'],
            'stock' => ['bail', 'required', 'integer', 'min:0'],
            'capital' => ['bail', 'required', 'numeric', 'min:0'],
            'markup' => ['bail', 'required', 'numeric', 'min:0', 'max:500'],
        ]);

        $supplierId = (int) $user->role === 1
            ? $validated['supplier_id']
            : $user->supplier_id;

        DB::transaction(function () use ($product, $validated, $supplierId, $request, $user) {

            // 1. Update core Product data (name, barcode, category)
            $product->update([
                'name' => trim($validated['name']),
                'barcode' => $validated['barcode'] ?? $product->barcode,
                'category_id' => $validated['category_id'],
            ]);

            // 2. Handle Image Upload (Fixed & Reliable)
            if ($request->hasFile('product_img')) {
                // Ensure directory exists
                if (! Storage::disk('public')->exists('products')) {
                    Storage::disk('public')->makeDirectory('products', 0755, true);
                }

                // Delete old image if exists
                if ($product->product_img) {
                    Storage::disk('public')->delete($product->product_img);
                }

                // Store new image
                $imagePath = $request->file('product_img')->store('products', 'public');

                // Update product with new image path
                $product->update(['product_img' => $imagePath]);
            }

            // 3. Update or Create ProductStock for this supplier
            ProductStock::updateOrCreate(
                [
                    'product_id' => $product->id,
                    'supplier_id' => $supplierId,
                ],
                [
                    'stock' => $validated['stock'],
                    'capital' => $validated['capital'],
                    'markup' => $validated['markup'],
                    'updated_by' => $user->id,
                ]
            );
        });

        // Refresh product to get latest image path
        $product->refresh();

        // Log Activity
        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'product_updated',
            'subject_type' => Product::class,
            'subject_id' => $product->id,
            'properties' => [
                'new_name' => trim($validated['name']),
                'new_barcode' => $product->barcode,
                'new_product_img' => $product->product_img,
                'category_id' => $validated['category_id'],
                'supplier_id' => $supplierId,
                'new_stock' => $validated['stock'],
                'new_capital' => $validated['capital'],
                'new_markup' => $validated['markup'],
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        // Return success response for Inertia
        return back()->with('message', [
            'type' => 'success',
            'text' => 'Product updated successfully.',
        ]);
    }

    public function destroy(Request $request, Product $product)
    {
        $user = Auth::user();

        if ((int) $user->role !== 1) {
            $hasAccess = $product->stocks()->where('supplier_id', $user->supplier_id)->exists();
            if (! $hasAccess) {
                abort(403, 'You do not have permission to delete this product.');
            }
        }

        if ($product->orderItems()->exists()) {
            throw ValidationException::withMessages(['error' => 'Cannot delete product — it is used in one or more orders.']);
        }

        if ($product->product_img) {
            Storage::disk('public')->delete($product->product_img);
        }

        $oldData = [
            'name' => $product->name,
            'barcode' => $product->barcode,
            'product_img' => $product->product_img,
            'category_id' => $product->category_id,
            'global_stock' => $product->stock,
        ];

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'product_deleted',
            'subject_type' => Product::class,
            'subject_id' => $product->id,
            'properties' => [
                'deleted_product' => $product->name,
                'old_data' => $oldData,
                'reason' => $request->input('reason', 'No reason provided'),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        $product->delete();

        return back()->with('message', ['type' => 'success', 'text' => 'Product deleted successfully.']);
    }

    private function generateNextBarcode(): string
    {
        $last = Product::latest('id')->first();
        $lastNumber = $last && $last->barcode ? (int) $last->barcode : 0;

        return str_pad($lastNumber + 1, 7, '0', STR_PAD_LEFT);
    }
}
