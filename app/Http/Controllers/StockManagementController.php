<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\ProductStock;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class StockManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = (string) $user->role === '1';

        $stockQuery = ProductStock::query()
            ->with(['product.category', 'supplier'])
            ->orderByDesc('updated_at');

        if (! $isAdmin) {
            $stockQuery->where('supplier_id', $user->supplier_id ?: 0);
        }

        $movementQuery = StockMovement::query()
            ->with(['product:id,name,barcode', 'supplier:id,name', 'destinationSupplier:id,name', 'user:id,fname,lname'])
            ->latest();

        if (! $isAdmin) {
            $movementQuery->where(function ($query) use ($user) {
                $query
                    ->where('supplier_id', $user->supplier_id ?: 0)
                    ->orWhere('destination_supplier_id', $user->supplier_id ?: 0);
            });
        }

        return Inertia::render('Products/StockManagement', [
            'stocks' => $stockQuery->get()->map(fn (ProductStock $stock) => [
                'id' => $stock->id,
                'product_id' => $stock->product_id,
                'product_name' => $stock->product?->name ?? 'Unknown product',
                'barcode' => $stock->product?->barcode,
                'category' => $stock->product?->category?->name,
                'supplier_id' => $stock->supplier_id,
                'supplier_name' => $stock->supplier?->name ?? 'Unknown supplier',
                'stock' => (int) $stock->stock,
                'capital' => (float) $stock->capital,
                'markup' => (float) $stock->markup,
                'price' => (float) $stock->price,
                'status' => $stock->stock_status,
            ]),
            'movements' => $movementQuery->limit(80)->get()->map(fn (StockMovement $movement) => [
                'id' => $movement->id,
                'type' => $movement->type,
                'quantity' => $movement->quantity,
                'stock_before' => $movement->stock_before,
                'stock_after' => $movement->stock_after,
                'reference_no' => $movement->reference_no,
                'remarks' => $movement->remarks,
                'created_at' => $movement->created_at?->format('M d, Y h:i A'),
                'product_name' => $movement->product?->name ?? 'Unknown product',
                'supplier_name' => $movement->supplier?->name ?? 'Unknown supplier',
                'destination_supplier_name' => $movement->destinationSupplier?->name,
                'user_name' => trim(($movement->user?->fname ?? '').' '.($movement->user?->lname ?? '')),
            ]),
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
            'isAdmin' => $isAdmin,
            'userSupplierId' => $user->supplier_id,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $isAdmin = (string) $user->role === '1';

        $validated = $request->validate([
            'product_stock_id' => ['required', 'integer', 'exists:product_stocks,id'],
            'type' => ['required', Rule::in(StockMovement::TYPES)],
            'quantity' => ['required', 'integer', 'min:1'],
            'destination_supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'reference_no' => ['nullable', 'string', 'max:120'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($validated, $user, $isAdmin, $request) {
            $stock = ProductStock::query()
                ->whereKey($validated['product_stock_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if (! $isAdmin && (int) $stock->supplier_id !== (int) $user->supplier_id) {
                abort(403, 'You can only manage stock for your assigned supplier.');
            }

            $type = $validated['type'];
            $quantity = (int) $validated['quantity'];
            $before = (int) $stock->stock;

            if (in_array($type, ['damaged', 'expired', 'transfer', 'correction_deduct'], true) && $quantity > $before) {
                throw ValidationException::withMessages([
                    'quantity' => "Quantity cannot be greater than available stock ({$before}).",
                ]);
            }

            if ($type === 'transfer') {
                $destinationId = (int) ($validated['destination_supplier_id'] ?? 0);

                if (! $destinationId || $destinationId === (int) $stock->supplier_id) {
                    throw ValidationException::withMessages([
                        'destination_supplier_id' => 'Select a different destination supplier for transfers.',
                    ]);
                }

                $this->applySourceMovement($stock, $type, $quantity, $validated, $user, $before);
                $this->applyTransferIn($stock, $destinationId, $quantity, $validated, $user);
            } else {
                $this->applySourceMovement($stock, $type, $quantity, $validated, $user, $before);
            }

            ActivityLog::create([
                'user_id' => $user->id,
                'action' => 'stock_movement_created',
                'subject_type' => StockMovement::class,
                'subject_id' => null,
                'properties' => [
                    'product_stock_id' => $stock->id,
                    'type' => $type,
                    'quantity' => $quantity,
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ],
            ]);
        });

        return back()->with('message', [
            'type' => 'success',
            'text' => 'Stock movement recorded successfully.',
        ]);
    }

    private function applySourceMovement(ProductStock $stock, string $type, int $quantity, array $validated, $user, int $before): StockMovement
    {
        $delta = match ($type) {
            'restock', 'correction_add' => $quantity,
            'damaged', 'expired', 'transfer', 'correction_deduct' => -$quantity,
        };

        $stock->stock = $before + $delta;
        $stock->updated_by = $user->id;
        $stock->save();

        return StockMovement::create([
            'product_stock_id' => $stock->id,
            'product_id' => $stock->product_id,
            'supplier_id' => $stock->supplier_id,
            'destination_supplier_id' => $type === 'transfer' ? $validated['destination_supplier_id'] : null,
            'user_id' => $user->id,
            'type' => $type,
            'quantity' => $quantity,
            'stock_before' => $before,
            'stock_after' => (int) $stock->stock,
            'reference_no' => $validated['reference_no'] ?? null,
            'remarks' => $validated['remarks'] ?? null,
        ]);
    }

    private function applyTransferIn(ProductStock $sourceStock, int $destinationSupplierId, int $quantity, array $validated, $user): void
    {
        $destinationStock = ProductStock::query()
            ->where('product_id', $sourceStock->product_id)
            ->where('supplier_id', $destinationSupplierId)
            ->lockForUpdate()
            ->first();

        if (! $destinationStock) {
            $destinationStock = ProductStock::create([
                'product_id' => $sourceStock->product_id,
                'supplier_id' => $destinationSupplierId,
                'stock' => 0,
                'capital' => $sourceStock->capital,
                'markup' => $sourceStock->markup,
                'updated_by' => $user->id,
            ]);
        }

        $before = (int) $destinationStock->stock;
        $destinationStock->stock = $before + $quantity;
        $destinationStock->updated_by = $user->id;
        $destinationStock->save();

        StockMovement::create([
            'product_stock_id' => $destinationStock->id,
            'product_id' => $destinationStock->product_id,
            'supplier_id' => $destinationSupplierId,
            'destination_supplier_id' => null,
            'user_id' => $user->id,
            'type' => 'transfer_in',
            'quantity' => $quantity,
            'stock_before' => $before,
            'stock_after' => (int) $destinationStock->stock,
            'reference_no' => $validated['reference_no'] ?? null,
            'remarks' => 'Received transfer from '.($sourceStock->supplier?->name ?? 'another supplier').'. '.($validated['remarks'] ?? ''),
        ]);
    }
}
