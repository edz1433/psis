<?php

namespace App\Http\Controllers;

use App\Helpers\MenuHelper;
use App\Models\Order;
use App\Models\RentalPayment;
use App\Models\RentalProperty;
use App\Models\RentalTenant;
use App\Models\RentalUnit;
use App\Models\Sale;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = (string) $user->role === '1';
        $access = $isAdmin ? MenuHelper::ids() : array_map('strval', $user->access ?? []);

        $from = $request->date('from')?->startOfDay() ?? now()->startOfMonth();
        $to = $request->date('to')?->endOfDay() ?? now()->endOfMonth();

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        $sections = $this->sections($access);

        return Inertia::render('Dashboard/Index', [
            'title' => 'Dashboard',
            'dashboard' => [
                'isAdmin' => $isAdmin,
                'supplierId' => $user->supplier_id,
                'dateRange' => [
                    'from' => $from->toDateString(),
                    'to' => $to->toDateString(),
                ],
                'sections' => $sections,
                'overview' => $this->overview($sections, $from, $to, $user, $isAdmin),
                'pos' => $this->posMetrics($from, $to, $user, $isAdmin),
                'shop' => $this->shopMetrics($from, $to, $user, $isAdmin),
                'rentals' => $this->rentalMetrics($from, $to),
            ],
        ]);
    }

    private function sections(array $access): array
    {
        $hasDashboardDataAccess = (bool) array_intersect($access, ['1', '2', '4', '12']);
        $items = [
            ['id' => '1', 'label' => 'Overview'],
            ['id' => '12', 'label' => 'POS'],
            ['id' => '2', 'label' => 'Shop'],
            ['id' => '4', 'label' => 'Rentals'],
        ];

        return array_values(array_filter($items, fn ($item) => $item['id'] === '1'
            ? $hasDashboardDataAccess
            : in_array($item['id'], $access, true)));
    }

    private function overview(array $sections, CarbonInterface $from, CarbonInterface $to, $user, bool $isAdmin): array
    {
        $sectionIds = collect($sections)->pluck('id')->all();
        $kpis = [];

        if (array_intersect($sectionIds, ['12', '2', '4'])) {
            $posRevenue = in_array('12', $sectionIds, true)
                ? (float) $this->scopeSupplier(Sale::query(), $user, $isAdmin)
                    ->whereBetween('created_at', [$from, $to])
                    ->where('status', 'completed')
                    ->sum('total')
                : 0;

            $orderRevenue = in_array('2', $sectionIds, true)
                ? (float) $this->completedOrdersInRange(
                    $this->scopeSupplier(Order::query(), $user, $isAdmin),
                    $from,
                    $to
                )->sum('total')
                : 0;

            $rentalCollections = in_array('4', $sectionIds, true)
                ? (float) RentalPayment::whereBetween('payment_date', [$from, $to])->sum('paid_amount')
                : 0;

            $kpis[] = ['title' => 'Total Revenue', 'value' => $this->money($posRevenue + $orderRevenue + $rentalCollections), 'detail' => 'POS, shop, and rental collections'];
            $kpis[] = ['title' => 'POS Revenue', 'value' => $this->money($posRevenue), 'detail' => 'Completed transactions'];
            $kpis[] = ['title' => 'Shop Revenue', 'value' => $this->money($orderRevenue), 'detail' => 'Completed shop orders only'];
            $kpis[] = ['title' => 'Rental Collections', 'value' => $this->money($rentalCollections), 'detail' => 'Paid rental amounts'];
        }

        return [
            'kpis' => $kpis,
            'revenueSeries' => $this->revenueSeries($from, $to, $user, $isAdmin, $sectionIds),
        ];
    }

    private function posMetrics(CarbonInterface $from, CarbonInterface $to, $user, bool $isAdmin): array
    {
        $salesQuery = $this->scopeSupplier(Sale::query(), $user, $isAdmin)
            ->whereBetween('created_at', [$from, $to])
            ->where('status', 'completed');

        return [
            'kpis' => [
                ['title' => 'POS Sales', 'value' => $this->money((float) (clone $salesQuery)->sum('total')), 'detail' => number_format((clone $salesQuery)->count()).' completed transactions'],
                ['title' => 'Average Sale', 'value' => $this->money((float) (clone $salesQuery)->avg('total')), 'detail' => 'Per completed transaction'],
                ['title' => 'Cash Sales', 'value' => $this->money((float) (clone $salesQuery)->where('payment_method', 'cash')->sum('total')), 'detail' => 'Cash payment method'],
            ],
            'monthlySales' => $this->monthlyTotals(Sale::class, 'total', $from, $to, $user, $isAdmin, ['status' => 'completed']),
            'recentSales' => $this->scopeSupplier(Sale::query(), $user, $isAdmin)
                ->whereBetween('created_at', [$from, $to])
                ->latest()
                ->limit(8)
                ->get()
                ->map(fn (Sale $sale) => [
                    'id' => $sale->id,
                    'reference' => $sale->receipt_number,
                    'customer' => $sale->customer_name ?: 'Walk-in customer',
                    'amount' => $this->money((float) $sale->total),
                    'status' => ucfirst($sale->status),
                    'date' => $sale->created_at?->format('M d, Y h:i A'),
                ]),
        ];
    }

    private function shopMetrics(CarbonInterface $from, CarbonInterface $to, $user, bool $isAdmin): array
    {
        $ordersQuery = $this->scopeSupplier(Order::query(), $user, $isAdmin)
            ->whereBetween('created_at', [$from, $to]);

        return [
            'kpis' => [
                ['title' => 'Shop Revenue', 'value' => $this->money((float) $this->completedOrdersInRange(clone $ordersQuery, $from, $to)->sum('total')), 'detail' => 'Completed shop orders only'],
                ['title' => 'Total Orders', 'value' => number_format((clone $ordersQuery)->count()), 'detail' => 'Selected period'],
                ['title' => 'Pending Orders', 'value' => number_format((clone $ordersQuery)->where('status', 'pending')->count()), 'detail' => 'Need supplier action'],
                ['title' => 'Completed Orders', 'value' => number_format((clone $ordersQuery)->where('status', 'completed')->count()), 'detail' => 'Fulfilled shop orders'],
            ],
            'monthlySales' => $this->monthlyCompletedOrderTotals($from, $to, $user, $isAdmin),
            'statusBreakdown' => [
                ['name' => 'Pending', 'value' => (clone $ordersQuery)->where('status', 'pending')->count()],
                ['name' => 'Approved', 'value' => (clone $ordersQuery)->where('status', 'approved')->count()],
                ['name' => 'Completed', 'value' => (clone $ordersQuery)->where('status', 'completed')->count()],
                ['name' => 'Cancelled', 'value' => (clone $ordersQuery)->where('status', 'cancelled')->count()],
            ],
            'recentOrders' => $this->scopeSupplier(Order::query(), $user, $isAdmin)
                ->whereBetween('created_at', [$from, $to])
                ->latest()
                ->limit(8)
                ->get()
                ->map(fn (Order $order) => [
                    'id' => $order->id,
                    'reference' => $order->order_number,
                    'customer' => $order->user?->full_name ?: 'Customer',
                    'amount' => $this->money((float) $order->total),
                    'status' => ucfirst($order->status),
                    'date' => $order->created_at?->format('M d, Y h:i A'),
                ]),
        ];
    }

    private function rentalMetrics(CarbonInterface $from, CarbonInterface $to): array
    {
        return [
            'kpis' => [
                ['title' => 'Collections', 'value' => $this->money((float) RentalPayment::whereBetween('payment_date', [$from, $to])->sum('paid_amount')), 'detail' => 'Paid amount in selected period'],
                ['title' => 'Receivables', 'value' => $this->money((float) RentalPayment::whereIn('status', ['unpaid', 'partial', 'overdue'])->selectRaw('SUM(amount - paid_amount) as balance')->value('balance')), 'detail' => 'Open rental balances'],
                ['title' => 'Properties', 'value' => number_format(RentalProperty::count()), 'detail' => 'Rental assets'],
                ['title' => 'Active Tenants', 'value' => number_format(RentalTenant::where('status', 'active')->count()), 'detail' => 'Currently active'],
            ],
            'monthlyCollections' => $this->monthlyRentalCollections($from, $to),
            'occupancy' => [
                ['name' => 'Occupied', 'value' => RentalUnit::where('status', 'occupied')->count() + RentalProperty::where('has_rooms_units', false)->where('status', 'occupied')->count()],
                ['name' => 'Available', 'value' => RentalUnit::where('status', 'available')->count() + RentalProperty::where('has_rooms_units', false)->where('status', 'available')->count()],
                ['name' => 'Reserved', 'value' => RentalUnit::where('status', 'reserved')->count() + RentalProperty::where('has_rooms_units', false)->where('status', 'reserved')->count()],
            ],
            'recentPayments' => RentalPayment::with(['tenant', 'property'])
                ->whereBetween('payment_date', [$from, $to])
                ->latest('payment_date')
                ->limit(8)
                ->get()
                ->map(fn (RentalPayment $payment) => [
                    'id' => $payment->id,
                    'reference' => $payment->reference_number ?: 'Payment #'.$payment->id,
                    'customer' => $payment->tenant?->full_name ?: 'Tenant',
                    'property' => $payment->property?->name ?: 'Rental property',
                    'amount' => $this->money((float) $payment->paid_amount),
                    'status' => ucfirst($payment->status),
                    'date' => $payment->payment_date?->format('M d, Y'),
                ]),
        ];
    }

    private function revenueSeries(CarbonInterface $from, CarbonInterface $to, $user, bool $isAdmin, array $sectionIds): array
    {
        $series = [];

        if (in_array('12', $sectionIds, true)) {
            $series[] = ['name' => 'POS Sales', 'data' => $this->monthlyTotals(Sale::class, 'total', $from, $to, $user, $isAdmin, ['status' => 'completed'])['data']];
        }

        if (in_array('2', $sectionIds, true)) {
            $series[] = ['name' => 'Shop Orders', 'data' => $this->monthlyCompletedOrderTotals($from, $to, $user, $isAdmin)['data']];
        }

        if (in_array('4', $sectionIds, true)) {
            $series[] = ['name' => 'Rentals', 'data' => $this->monthlyRentalCollections($from, $to)['data']];
        }

        return [
            'categories' => $this->monthLabels($from, $to),
            'series' => $series,
        ];
    }

    private function monthlyTotals(string $model, string $column, CarbonInterface $from, CarbonInterface $to, $user, bool $isAdmin, array $equals = []): array
    {
        $labels = $this->monthLabels($from, $to);
        $data = [];

        foreach ($this->monthRanges($from, $to) as [$start, $end]) {
            $query = $this->scopeSupplier($model::query(), $user, $isAdmin)
                ->whereBetween('created_at', [$start, $end]);

            foreach ($equals as $field => $value) {
                is_array($value)
                    ? $query->whereIn($field, $value)
                    : $query->where($field, $value);
            }

            $data[] = round((float) $query->sum($column), 2);
        }

        return ['categories' => $labels, 'data' => $data];
    }

    private function monthlyCompletedOrderTotals(CarbonInterface $from, CarbonInterface $to, $user, bool $isAdmin): array
    {
        $labels = $this->monthLabels($from, $to);
        $data = [];

        foreach ($this->monthRanges($from, $to) as [$start, $end]) {
            $query = $this->completedOrdersInRange(
                $this->scopeSupplier(Order::query(), $user, $isAdmin),
                $start,
                $end
            );

            $data[] = round((float) $query->sum('total'), 2);
        }

        return ['categories' => $labels, 'data' => $data];
    }

    private function completedOrdersInRange(Builder $query, CarbonInterface $from, CarbonInterface $to): Builder
    {
        $query->where('status', 'completed');

        if (! Schema::hasColumn('orders', 'completed_at')) {
            return $query->whereBetween('created_at', [$from, $to]);
        }

        return $query->where(function (Builder $dateQuery) use ($from, $to) {
            $dateQuery
                ->whereBetween('completed_at', [$from, $to])
                ->orWhere(function (Builder $fallbackQuery) use ($from, $to) {
                    $fallbackQuery
                        ->whereNull('completed_at')
                        ->whereBetween('updated_at', [$from, $to]);
                });
        });
    }

    private function monthlyRentalCollections(CarbonInterface $from, CarbonInterface $to): array
    {
        $labels = $this->monthLabels($from, $to);
        $data = [];

        foreach ($this->monthRanges($from, $to) as [$start, $end]) {
            $data[] = round((float) RentalPayment::whereBetween('payment_date', [$start, $end])->sum('paid_amount'), 2);
        }

        return ['categories' => $labels, 'data' => $data];
    }

    private function monthLabels(CarbonInterface $from, CarbonInterface $to): array
    {
        return array_map(fn ($range) => $range[0]->format('M Y'), $this->monthRanges($from, $to));
    }

    private function monthRanges(CarbonInterface $from, CarbonInterface $to): array
    {
        $ranges = [];
        $cursor = $from->copy()->startOfMonth();

        while ($cursor->lessThanOrEqualTo($to)) {
            $start = $cursor->lessThan($from) ? $from->copy() : $cursor->copy();
            $endOfMonth = $cursor->copy()->endOfMonth();
            $end = $endOfMonth->greaterThan($to) ? $to->copy() : $endOfMonth;

            $ranges[] = [
                $start,
                $end,
            ];
            $cursor = $cursor->addMonth();
        }

        return $ranges;
    }

    private function scopeSupplier(Builder $query, $user, bool $isAdmin): Builder
    {
        if (! $isAdmin) {
            $query->where('supplier_id', $user->supplier_id ?: 0);
        }

        return $query;
    }

    private function money(float $value): string
    {
        return '₱'.number_format($value, 2);
    }
}
