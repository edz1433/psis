<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductStock;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PosController extends Controller
{
    private function authorizeSale(Sale $sale)
    {
        $user = Auth::user();
        if ((int) $user->role === 1) {
            return;
        } // admin can access everything

        if ($sale->supplier_id !== $user->supplier_id) {
            abort(403, 'Unauthorized access to this sale.');
        }
    }

    public function index()
    {
        $user = Auth::user();
        if (! $user->supplier_id && (int) $user->role !== 1) {
            abort(403);
        }

        $supplierId = $user->supplier_id;

        $products = Product::query()
            ->with('category')
            ->whereHas('stocks', fn ($q) => $q
                ->where('stock', '>', 0)
                ->where('supplier_id', $supplierId)
            )
            ->with(['stocks' => fn ($q) => $q->where('supplier_id', $supplierId)])
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'barcode' => $p->barcode,
                'product_img' => $p->product_img
                    ? asset('storage/'.$p->product_img)
                    : null,
                'price' => (float) ($p->stocks->first()?->price ?? 0),
                'stock' => (int) ($p->stocks->first()?->stock ?? 0),
                'category' => $p->category ? [
                    'id' => $p->category->id,
                    'name' => $p->category->name,
                ] : null,
            ]);

        return Inertia::render('Pos/Index', [
            'products' => $products,
            'categories' => Category::select('id', 'name')->orderBy('name')->get(),
            'storeName' => $user->supplier?->name ?? 'Cashier Terminal',
        ]);
    }

    /**
     * Sales History
     */
    public function history()
    {
        $user = Auth::user();
        if (! $user->supplier_id && (int) $user->role !== 1) {
            abort(403);
        }

        $supplierId = $user->supplier_id;

        $sales = Sale::with(['items.product'])
            ->where('supplier_id', $supplierId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($sale) {
                return [
                    'id' => $sale->id,
                    'receipt_number' => $sale->receipt_number,
                    'created_at' => $sale->created_at->toIso8601String(),
                    'customer_name' => $sale->customer_name,
                    'payment_method' => $sale->payment_method,
                    'total' => (float) $sale->total,
                    'payment_amount' => (float) $sale->payment_amount,
                    'change' => (float) $sale->change,
                    'notes' => $sale->notes,
                    'items' => $sale->items->map(fn ($item) => [
                        'product' => ['name' => $item->product?->name ?? 'Unknown Product'],
                        'quantity' => (int) $item->quantity,
                        'price' => (float) $item->price,
                    ])->values(),
                ];
            });

        return Inertia::render('Pos/History', [
            'sales' => $sales,
            'storeName' => $user->supplier?->name ?? 'Cashier Terminal',
        ]);
    }

    public function show(Sale $sale)
    {
        $this->authorizeSale($sale);
        $sale->load(['items.product', 'supplier']);

        $payload = [
            'id' => $sale->id,
            'receipt_number' => $sale->receipt_number,
            'created_at' => $sale->created_at->toIso8601String(),
            'customer_name' => $sale->customer_name,
            'payment_method' => $sale->payment_method,
            'total' => (float) $sale->total,
            'payment_amount' => (float) $sale->payment_amount,
            'change' => (float) $sale->change,
            'notes' => $sale->notes,
            'items' => $sale->items->map(fn ($item) => [
                'product' => ['name' => $item->product?->name ?? 'Unknown Product'],
                'quantity' => (int) $item->quantity,
                'price' => (float) $item->price,
            ])->values(),
        ];

        return Inertia::render('Pos/Show', [
            'sale' => $payload,
            'storeName' => $sale->supplier?->name ?? 'Cashier Terminal',
        ]);
    }

    public function edit(Sale $sale)
    {
        $this->authorizeSale($sale);

        $user = Auth::user();
        if ($sale->created_at->isBefore(today()) && (int) $user->role !== 1) {
            abort(403, 'You can only edit sales made today.');
        }

        $sale->load('items.product');

        $supplierId = $user->supplier_id;

        $products = Product::query()
            ->with('category')
            ->whereHas('stocks', fn ($q) => $q->where('supplier_id', $supplierId))
            ->with(['stocks' => fn ($q) => $q->where('supplier_id', $supplierId)])
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'barcode' => $p->barcode,
                'product_img' => $p->product_img ? asset('storage/'.$p->product_img) : null,
                'price' => (float) ($p->stocks->first()?->price ?? 0),
                'stock' => (int) ($p->stocks->first()?->stock ?? 0),
                'category' => $p->category ? [
                    'id' => $p->category->id,
                    'name' => $p->category->name,
                ] : null,
            ]);

        $payloadSale = [
            'id' => $sale->id,
            'receipt_number' => $sale->receipt_number,
            'payment_method' => $sale->payment_method,
            'customer_name' => $sale->customer_name,
            'total' => (float) $sale->total,
            'payment_amount' => (float) $sale->payment_amount,
            'change' => (float) $sale->change,
            'notes' => $sale->notes,
            'items' => $sale->items->map(fn ($item) => [
                'product_id' => $item->product_id,
                'product' => ['name' => $item->product?->name ?? 'Unknown Product'],
                'quantity' => (int) $item->quantity,
                'price' => (float) $item->price,
            ])->values(),
        ];

        return Inertia::render('Pos/Edit', [
            'sale' => $payloadSale,
            'products' => $products,
            'storeName' => $sale->supplier?->name ?? 'Cashier Terminal',
        ]);
    }

    public function update(Request $request, Sale $sale)
    {
        $this->authorizeSale($sale);

        $user = Auth::user();
        $supplierId = $user->supplier_id;

        if ($sale->created_at->isBefore(today()) && (int) $user->role !== 1) {
            return response()->json([
                'success' => false,
                'message' => 'Only today\'s sales can be edited.',
            ], 403);
        }

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'exists:products,id'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'payment_method' => ['required', 'in:cash,gcash,card'],
            'tender' => ['nullable', 'numeric', 'min:0'],
            'customer_name' => ['nullable', 'string', 'max:80'],
            'discount_percent' => ['nullable', 'numeric', 'between:0,100'],
        ]);

        DB::beginTransaction();

        try {
            foreach ($sale->items as $oldItem) {
                ProductStock::where('product_id', $oldItem->product_id)
                    ->where('supplier_id', $supplierId)
                    ->increment('stock', $oldItem->quantity);
            }

            $sale->items()->delete();

            $subtotal = 0;
            $saleItemsData = [];

            foreach ($validated['items'] as $item) {
                $stock = ProductStock::where('product_id', $item['id'])
                    ->where('supplier_id', $supplierId)
                    ->lockForUpdate()
                    ->first();

                if (! $stock || $stock->stock < $item['qty']) {
                    DB::rollBack();

                    return response()->json([
                        'success' => false,
                        'message' => "Insufficient stock for product ID {$item['id']}.",
                    ], 422);
                }

                $lineTotal = $stock->price * $item['qty'];
                $subtotal += $lineTotal;

                $saleItemsData[] = [
                    'product_id' => $item['id'],
                    'quantity' => $item['qty'],
                    'price' => $stock->price,
                    'total' => $lineTotal,
                ];
            }

            $discountPercent = (float) ($validated['discount_percent'] ?? 0);
            $discountAmount = round($subtotal * ($discountPercent / 100), 2);
            $totalDue = round($subtotal - $discountAmount, 2);

            if ($validated['payment_method'] !== 'cash') {
                $tender = $totalDue;
            } else {
                $tender = (float) ($validated['tender'] ?? 0);

                if ($tender < $totalDue) {
                    DB::rollBack();

                    return response()->json([
                        'success' => false,
                        'message' => 'Insufficient cash tender.',
                    ], 422);
                }
            }

            $sale->update([
                'payment_method' => $validated['payment_method'],
                'customer_name' => $validated['customer_name'] ?? null,
                'total' => $totalDue,
                'payment_amount' => $tender,
                'change' => max(0, round($tender - $totalDue, 2)),
                'notes' => $discountPercent > 0
                    ? "Discount: {$discountPercent}% (₱".number_format($discountAmount, 2).')'
                    : null,
            ]);

            foreach ($saleItemsData as $data) {
                $sale->items()->create($data);

                ProductStock::where('product_id', $data['product_id'])
                    ->where('supplier_id', $supplierId)
                    ->decrement('stock', $data['quantity']);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sale updated successfully',
                'receipt_number' => $sale->receipt_number,
                'total' => $totalDue,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'Failed to update sale.',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $supplierId = $user->supplier_id;

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'exists:products,id'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'payment_method' => ['required', 'in:cash,gcash,card'],
            'tender' => ['nullable', 'numeric', 'min:0'],
            'customer_name' => ['nullable', 'string', 'max:80'],
            'discount_percent' => ['nullable', 'numeric', 'between:0,100'],
        ]);

        DB::beginTransaction();

        try {
            $subtotal = 0;
            $saleItemsData = [];

            foreach ($validated['items'] as $item) {
                $stock = ProductStock::where('product_id', $item['id'])
                    ->where('supplier_id', $supplierId)
                    ->lockForUpdate()
                    ->first();

                if (! $stock || $stock->stock < $item['qty']) {
                    DB::rollBack();

                    return response()->json([
                        'success' => false,
                        'message' => "Insufficient stock for product ID {$item['id']}.",
                    ], 422);
                }

                $lineTotal = $stock->price * $item['qty'];
                $subtotal += $lineTotal;

                $saleItemsData[] = [
                    'product_id' => $item['id'],
                    'quantity' => $item['qty'],
                    'price' => $stock->price,
                    'total' => $lineTotal,
                ];
            }

            $discountPercent = (float) ($validated['discount_percent'] ?? 0);
            $discountAmount = round($subtotal * ($discountPercent / 100), 2);
            $totalDue = round($subtotal - $discountAmount, 2);

            if ($validated['payment_method'] !== 'cash') {
                $tender = $totalDue;
            } else {
                $tender = (float) ($validated['tender'] ?? 0);

                if ($tender < $totalDue) {
                    DB::rollBack();

                    return response()->json([
                        'success' => false,
                        'message' => 'Insufficient cash tender.',
                    ], 422);
                }
            }

            $sale = Sale::create([
                'user_id' => $user->id,
                'supplier_id' => $supplierId,
                'payment_method' => $validated['payment_method'],
                'customer_name' => $validated['customer_name'] ?? null,
                'status' => 'completed',
                'total' => $totalDue,
                'payment_amount' => $tender,
                'change' => max(0, round($tender - $totalDue, 2)),
                'notes' => $discountPercent > 0
                    ? "Discount: {$discountPercent}% (₱".number_format($discountAmount, 2).')'
                    : null,
                'receipt_number' => 'C-'.now()->format('ymdHis').'-'.str_pad(Sale::count() + 1, 4, '0', STR_PAD_LEFT),
            ]);

            foreach ($saleItemsData as $data) {
                $sale->items()->create($data);

                ProductStock::where('product_id', $data['product_id'])
                    ->where('supplier_id', $supplierId)
                    ->decrement('stock', $data['quantity']);
            }

            DB::commit();

            // ←←← THIS IS THE IMPORTANT CHANGE
            return response()->json([
                'success' => true,
                'message' => 'Sale completed successfully',
                'receipt_number' => $sale->receipt_number,
                'total' => $totalDue,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'An unexpected error occurred.',
            ], 500);
        }
    }
}
