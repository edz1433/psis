<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\RentalPayment;
use App\Models\RentalProperty;
use App\Models\RentalTenant;
use App\Models\SystemSetting;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class RentalPaymentController extends Controller
{
    public function index(): Response
    {
        $payments = RentalPayment::query()
            ->with([
                'tenant:id,first_name,last_name,property_id',
                'tenant.roomUnit:id,property_id,name',
                'property:id,name,type,has_rooms_units',
                'roomUnit:id,property_id,name',
                'receivedBy:id,fname,lname',
            ])
            ->latest('due_date')
            ->get();

        $tenants = RentalTenant::query()
            ->where('status', 'active')
            ->with(['property:id,name,has_rooms_units', 'roomUnit:id,property_id,name'])
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'property_id', 'room_unit_id', 'monthly_rent']);

        $properties = RentalProperty::query()
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'has_rooms_units']);

        return Inertia::render('Rentals/Payments/Index', [
            'payments' => $payments,
            'tenants' => $tenants,
            'properties' => $properties,
            'title' => 'Rental Payments',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'tenant_id' => 'required|exists:rental_tenants,id',
            'property_id' => 'required|exists:rental_properties,id',
            'room_unit_id' => 'nullable|exists:rental_units,id',
            'billing_month' => ['nullable', 'date_format:Y-m', Rule::unique('rental_payments', 'billing_month')->where('tenant_id', $request->input('tenant_id'))],
            'monthly_rent_amount' => 'nullable|numeric|min:0',
            'previous_balance' => 'nullable|numeric',
            'amount' => 'required|numeric',
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_date' => 'nullable|date',
            'due_date' => 'required|date',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
            'payment_method' => ['required', Rule::in(['cash', 'bank_transfer', 'gcash', 'maya', 'check'])],
            'reference_number' => 'nullable|string|max:100',
            'status' => ['nullable', Rule::in(['paid', 'unpaid', 'partial', 'overdue'])],
            'notes' => 'nullable|string|max:2000',
        ], [
            'tenant_id.required' => 'Please select a tenant.',
            'property_id.required' => 'Please select a property.',
            'amount.required' => 'Amount is required.',
            'due_date.required' => 'Due date is required.',
            'period_end.after_or_equal' => 'Period end must be on or after the start date.',
        ]);

        $validated['received_by'] = auth()->id();
        $this->normalizeBillingPayload($validated);

        $payment = RentalPayment::create($validated);

        $tenant = RentalTenant::find($validated['tenant_id']);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'rental_payment_recorded',
            'subject_type' => RentalPayment::class,
            'subject_id' => $payment->id,
            'properties' => [
                'tenant_name' => $tenant?->full_name,
                'amount' => $payment->amount,
                'payment_method' => $payment->payment_method,
                'status' => $payment->status,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return back()->with('message', [
            'type' => 'success',
            'text' => 'Payment recorded successfully.',
        ]);
    }

    public function update(Request $request, RentalPayment $rentalPayment): RedirectResponse
    {
        $validated = $request->validate([
            'tenant_id' => 'required|exists:rental_tenants,id',
            'property_id' => 'required|exists:rental_properties,id',
            'room_unit_id' => 'nullable|exists:rental_units,id',
            'billing_month' => [
                'nullable',
                'date_format:Y-m',
                Rule::unique('rental_payments', 'billing_month')
                    ->where('tenant_id', $request->input('tenant_id'))
                    ->ignore($rentalPayment->id),
            ],
            'monthly_rent_amount' => 'nullable|numeric|min:0',
            'previous_balance' => 'nullable|numeric',
            'amount' => 'required|numeric',
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_date' => 'nullable|date',
            'due_date' => 'required|date',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
            'payment_method' => ['required', Rule::in(['cash', 'bank_transfer', 'gcash', 'maya', 'check'])],
            'reference_number' => 'nullable|string|max:100',
            'status' => ['nullable', Rule::in(['paid', 'unpaid', 'partial', 'overdue'])],
            'notes' => 'nullable|string|max:2000',
        ]);

        $this->normalizeBillingPayload($validated);

        $oldData = $rentalPayment->only(['amount', 'monthly_rent_amount', 'previous_balance', 'paid_amount', 'status', 'payment_method']);
        $rentalPayment->update($validated);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'rental_payment_updated',
            'subject_type' => RentalPayment::class,
            'subject_id' => $rentalPayment->id,
            'properties' => [
                'old_data' => $oldData,
                'new_status' => $rentalPayment->status,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return back()->with('message', [
            'type' => 'success',
            'text' => 'Payment updated successfully.',
        ]);
    }

    public function destroy(Request $request, RentalPayment $rentalPayment): RedirectResponse
    {
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'rental_payment_deleted',
            'subject_type' => RentalPayment::class,
            'subject_id' => $rentalPayment->id,
            'properties' => [
                'amount' => $rentalPayment->amount,
                'tenant_id' => $rentalPayment->tenant_id,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        $rentalPayment->delete();

        return back()->with('message', [
            'type' => 'success',
            'text' => 'Payment record deleted successfully.',
        ]);
    }

    public function print(Request $request): SymfonyResponse
    {
        $validated = $request->validate([
            'billing_month' => 'required|date_format:Y-m',
            'tenant_id' => 'nullable|exists:rental_tenants,id',
        ]);

        $billings = RentalPayment::query()
            ->with([
                'tenant:id,first_name,last_name,email,phone,address,property_id,room_unit_id',
                'property:id,name,type,address,has_rooms_units',
                'roomUnit:id,name,floor_level',
            ])
            ->where('billing_month', $validated['billing_month'])
            ->when($validated['tenant_id'] ?? null, fn ($query, $tenantId) => $query->where('tenant_id', $tenantId))
            ->orderBy('property_id')
            ->orderBy('tenant_id')
            ->get();

        if ($billings->isEmpty()) {
            throw ValidationException::withMessages([
                'billing_month' => 'No billing records found for the selected filters.',
            ]);
        }

        $pdf = Pdf::loadView('pdf.rental-billings', [
            'billings' => $billings,
            'billingMonth' => Carbon::createFromFormat('Y-m', $validated['billing_month'])->format('F Y'),
            'generatedAt' => now(),
            'systemSettings' => SystemSetting::current(),
        ]);

        $suffix = isset($validated['tenant_id']) ? "-tenant-{$validated['tenant_id']}" : '-bulk';

        return $pdf->stream("rental-billings-{$validated['billing_month']}{$suffix}.pdf");
    }

    public function printBilling(RentalPayment $rentalPayment): SymfonyResponse
    {
        $rentalPayment->load([
            'tenant:id,first_name,last_name,email,phone,address,property_id,room_unit_id',
            'property:id,name,type,address,has_rooms_units',
            'roomUnit:id,name,floor_level',
        ]);

        $pdf = Pdf::loadView('pdf.rental-billings', [
            'billings' => collect([$rentalPayment]),
            'billingMonth' => $rentalPayment->billing_month
                ? Carbon::createFromFormat('Y-m', $rentalPayment->billing_month)->format('F Y')
                : $rentalPayment->period_start?->format('F Y'),
            'generatedAt' => now(),
            'systemSettings' => SystemSetting::current(),
        ]);

        return $pdf->stream("rental-billing-{$rentalPayment->id}.pdf");
    }

    public function generate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'billing_month' => 'required|date_format:Y-m',
            'due_date' => 'required|date',
            'tenant_id' => 'nullable|exists:rental_tenants,id',
        ]);

        $periodStart = Carbon::createFromFormat('Y-m-d', "{$validated['billing_month']}-01")->startOfMonth();
        $periodEnd = $periodStart->copy()->endOfMonth();
        $dueDate = Carbon::parse($validated['due_date']);

        $tenants = RentalTenant::query()
            ->where('status', 'active')
            ->when($validated['tenant_id'] ?? null, fn ($query, $tenantId) => $query->whereKey($tenantId))
            ->with(['property:id,has_rooms_units', 'roomUnit:id,property_id'])
            ->get();

        $created = 0;
        $skipped = 0;

        foreach ($tenants as $tenant) {
            if ($tenant->property?->has_rooms_units && ! $tenant->room_unit_id) {
                $skipped++;

                continue;
            }

            $exists = RentalPayment::where('tenant_id', $tenant->id)
                ->where('billing_month', $validated['billing_month'])
                ->exists();

            if ($exists) {
                $skipped++;

                continue;
            }

            $previousBalance = $this->previousBalanceForTenant($tenant->id, $validated['billing_month']);

            RentalPayment::create([
                'tenant_id' => $tenant->id,
                'property_id' => $tenant->property_id,
                'room_unit_id' => $tenant->room_unit_id,
                'billing_month' => $validated['billing_month'],
                'monthly_rent_amount' => $tenant->monthly_rent,
                'previous_balance' => $previousBalance,
                'amount' => (float) $tenant->monthly_rent + $previousBalance,
                'paid_amount' => 0,
                'payment_date' => null,
                'due_date' => $dueDate->toDateString(),
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodEnd->toDateString(),
                'payment_method' => 'cash',
                'status' => ((float) $tenant->monthly_rent + $previousBalance) <= 0
                    ? 'paid'
                    : ($dueDate->copy()->endOfDay()->isPast() ? 'overdue' : 'unpaid'),
                'received_by' => auth()->id(),
            ]);

            $created++;
        }

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'rental_billing_generated',
            'subject_type' => RentalPayment::class,
            'properties' => [
                'billing_month' => $validated['billing_month'],
                'due_date' => $validated['due_date'],
                'tenant_id' => $validated['tenant_id'] ?? 'all',
                'created' => $created,
                'skipped' => $skipped,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return back()->with('message', [
            'type' => 'success',
            'text' => "Generated {$created} billing record(s). Skipped {$skipped} duplicate or incomplete tenant record(s).",
        ]);
    }

    private function normalizeBillingPayload(array &$validated): void
    {
        $tenant = RentalTenant::findOrFail($validated['tenant_id']);

        if ((int) $validated['property_id'] !== $tenant->property_id) {
            throw ValidationException::withMessages([
                'property_id' => 'Selected property does not match the tenant assignment.',
            ]);
        }

        $validated['room_unit_id'] = $tenant->room_unit_id;
        $validated['previous_balance'] = $validated['previous_balance'] ?? 0;
        $validated['monthly_rent_amount'] = $validated['monthly_rent_amount'] ?? max((float) $validated['amount'] - (float) $validated['previous_balance'], 0);
        $validated['paid_amount'] = $validated['paid_amount'] ?? 0;
        $this->fillBillingPeriod($validated);

        $validated['status'] = $this->billingStatus(
            (float) $validated['amount'],
            (float) $validated['paid_amount'],
            $validated['due_date'],
        );

        if (in_array($validated['status'], ['paid', 'partial'], true) && empty($validated['payment_date'])) {
            $validated['payment_date'] = now()->toDateString();
        }

        if ((float) $validated['paid_amount'] <= 0) {
            $validated['payment_date'] = null;
        }
    }

    private function billingStatus(float $amount, float $paidAmount, string $dueDate): string
    {
        if ($paidAmount >= $amount) {
            return 'paid';
        }

        if ($paidAmount > 0) {
            return 'partial';
        }

        return Carbon::parse($dueDate)->endOfDay()->isPast() ? 'overdue' : 'unpaid';
    }

    private function previousBalanceForTenant(int $tenantId, string $billingMonth): float
    {
        $latestPreviousBilling = RentalPayment::query()
            ->where('tenant_id', $tenantId)
            ->whereNotNull('billing_month')
            ->where('billing_month', '<', $billingMonth)
            ->orderByDesc('billing_month')
            ->first(['amount', 'paid_amount']);

        if ($latestPreviousBilling) {
            return (float) $latestPreviousBilling->amount - (float) $latestPreviousBilling->paid_amount;
        }

        return RentalPayment::query()
            ->where('tenant_id', $tenantId)
            ->whereNull('billing_month')
            ->get(['amount', 'paid_amount'])
            ->sum(fn (RentalPayment $billing) => (float) $billing->amount - (float) $billing->paid_amount);
    }

    private function fillBillingPeriod(array &$validated): void
    {
        if (! empty($validated['period_start']) && ! empty($validated['period_end'])) {
            return;
        }

        $periodMonth = $validated['billing_month']
            ?? Carbon::parse($validated['due_date'])->format('Y-m');

        $periodStart = Carbon::createFromFormat('Y-m-d', "{$periodMonth}-01")->startOfMonth();

        $validated['period_start'] = $validated['period_start'] ?? $periodStart->toDateString();
        $validated['period_end'] = $validated['period_end'] ?? $periodStart->copy()->endOfMonth()->toDateString();
    }
}
