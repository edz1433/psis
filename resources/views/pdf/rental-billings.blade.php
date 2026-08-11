<!DOCTYPE html>
<html>
<head>
    <title>Rental Billing Statement - {{ $billingMonth }}</title>
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 22px;
            color: #111827;
            font-size: 12px;
            line-height: 1.35;
        }
        .statement {
            border: 1px solid #d7dce3;
            margin-bottom: 22px;
            background: #ffffff;
        }
        .page-break { page-break-before: always; }
        .topbar {
            background: #15803d;
            color: #ffffff;
            padding: 14px 18px;
        }
        .brand-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 2px;
        }
        .brand-subtitle { font-size: 11px; }
        .statement-title {
            text-align: right;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .meta-line {
            background: #f8fafc;
            border-bottom: 1px solid #d7dce3;
            padding: 9px 18px;
            color: #4b5563;
        }
        .content { padding: 18px; }
        .section-title {
            color: #6b7280;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: .4px;
            margin-bottom: 6px;
        }
        .tenant-name {
            font-size: 17px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .muted { color: #6b7280; }
        .summary-box {
            border: 1px solid #cbd5e1;
            border-top: 4px solid #15803d;
            padding: 12px;
        }
        .amount-label {
            color: #6b7280;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: bold;
        }
        .amount-due {
            color: #166534;
            font-size: 26px;
            font-weight: bold;
            text-align: right;
            margin: 6px 0 10px;
        }
        .summary-line {
            border-top: 1px solid #e5e7eb;
            padding-top: 7px;
            margin-top: 7px;
        }
        .summary-line .value {
            float: right;
            font-weight: bold;
        }
        .status {
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 2px 6px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th {
            background: #f1f5f9;
            color: #374151;
            border: 1px solid #d7dce3;
            padding: 8px;
            font-size: 11px;
            text-align: left;
            text-transform: uppercase;
        }
        td {
            border: 1px solid #d7dce3;
            padding: 8px;
            vertical-align: top;
        }
        .layout-table td {
            border: 0;
            padding: 0;
        }
        .right { text-align: right; }
        .total-row td {
            background: #f8fafc;
            font-weight: bold;
        }
        .notice {
            border-left: 4px solid #15803d;
            background: #f0fdf4;
            padding: 10px 12px;
            margin-top: 15px;
            color: #374151;
        }
        .remittance {
            border: 1px dashed #9ca3af;
            margin-top: 16px;
            padding: 12px;
        }
        .footer {
            margin-top: 16px;
            font-size: 10px;
            color: #6b7280;
            text-align: center;
        }
        .clearfix { clear: both; }
    </style>
</head>
<body>
@php
    $systemName = $systemSettings?->system_name ?? config('app.name', 'Rental Management');
    $institutionName = $systemSettings?->institution_name ?? 'Central Philippines State University';
    $institutionAddress = $systemSettings?->institution_address ?? 'Camingawan, Kabankalan City, Negros Occidental';
    $systemLogo = $systemSettings?->logoDataUri();
@endphp
@foreach($billings as $billing)
    @php
        $currentRent = (float) ($billing->monthly_rent_amount ?: max((float) $billing->amount - (float) $billing->previous_balance, 0));
        $previousBalance = (float) $billing->previous_balance;
        $totalDue = (float) $billing->amount;
        $paidAmount = (float) $billing->paid_amount;
        $balance = $totalDue - $paidAmount;
        $amountDue = max($balance, 0);
        $credit = abs(min($balance, 0));
        $accountNo = 'RT-' . str_pad((string) $billing->tenant_id, 6, '0', STR_PAD_LEFT);
        $statementNo = 'RB-' . str_pad((string) $billing->id, 7, '0', STR_PAD_LEFT);
        $roomUnit = $billing->roomUnit
            ? $billing->roomUnit->name . ($billing->roomUnit->floor_level ? ' - ' . $billing->roomUnit->floor_level : '')
            : 'Direct property assignment';
    @endphp

    <div class="{{ $loop->first ? '' : 'page-break' }}"></div>
    <div class="statement">
        <div class="topbar">
            <table class="layout-table">
                <tr>
                    <td style="width: 55%;">
                        @if($systemLogo)
                            <img src="{{ $systemLogo }}" alt="{{ $systemName }} Logo" style="max-height: 42px; max-width: 120px; margin-bottom: 6px;">
                        @endif
                        <div class="brand-name">{{ $systemName }}</div>
                        <div class="brand-subtitle">{{ $institutionName }}</div>
                        <div class="brand-subtitle">{{ $institutionAddress }}</div>
                    </td>
                    <td style="width: 45%;" class="statement-title">Statement of Account</td>
                </tr>
            </table>
        </div>

        <div class="meta-line">
            <table class="layout-table">
                <tr>
                    <td style="width: 45%;">Billing Month: <strong>{{ $billingMonth }}</strong></td>
                    <td style="width: 55%;" class="right">
                        Statement No: <strong>{{ $statementNo }}</strong> |
                        Generated: <strong>{{ $generatedAt->format('M d, Y') }}</strong>
                    </td>
                </tr>
            </table>
        </div>

        <div class="content">
            <table class="layout-table">
                <tr>
                    <td style="width: 58%; padding-right: 14px;">
                        <div class="section-title">Bill To</div>
                        <div class="tenant-name">{{ $billing->tenant?->full_name ?? 'Tenant #' . $billing->tenant_id }}</div>
                        <div>{{ $billing->tenant?->address ?? 'Address not provided' }}</div>
                        <div class="muted">
                            Contact: {{ $billing->tenant?->phone ?? 'N/A' }}
                            @if($billing->tenant?->email)
                                | {{ $billing->tenant->email }}
                            @endif
                        </div>

                        <br>
                        <div class="section-title">Service Address</div>
                        <div><strong>{{ $billing->property?->name ?? 'Property #' . $billing->property_id }}</strong></div>
                        <div>{{ $billing->property?->address ?? 'Property address not provided' }}</div>
                        <div class="muted">Room/Unit: {{ $roomUnit }}</div>
                    </td>

                    <td style="width: 42%;">
                        <div class="summary-box">
                            <div class="amount-label">Amount Due</div>
                            <div class="amount-due">PHP {{ number_format($amountDue, 2) }}</div>

                            <div class="summary-line">Due Date <span class="value">{{ $billing->due_date?->format('M d, Y') ?? 'N/A' }}</span><div class="clearfix"></div></div>
                            <div class="summary-line">Account No. <span class="value">{{ $accountNo }}</span><div class="clearfix"></div></div>
                            <div class="summary-line">Status <span class="value"><span class="status">{{ $billing->status }}</span></span><div class="clearfix"></div></div>

                            @if($credit > 0)
                                <div class="summary-line">Credit for Next Billing <span class="value">PHP {{ number_format($credit, 2) }}</span><div class="clearfix"></div></div>
                            @endif
                        </div>
                    </td>
                </tr>
            </table>

            <br>
            <div class="section-title">Billing Summary</div>
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th class="right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Monthly rental charge for {{ $billingMonth }}</td>
                        <td class="right">PHP {{ number_format($currentRent, 2) }}</td>
                    </tr>
                    <tr>
                        <td>Previous balance / credit</td>
                        <td class="right">PHP {{ number_format($previousBalance, 2) }}</td>
                    </tr>
                    <tr class="total-row">
                        <td>Total charges for this statement</td>
                        <td class="right">PHP {{ number_format($totalDue, 2) }}</td>
                    </tr>
                    <tr>
                        <td>Payments received</td>
                        <td class="right">PHP {{ number_format($paidAmount, 2) }}</td>
                    </tr>
                    <tr class="total-row">
                        <td>{{ $balance < 0 ? 'Credit balance' : 'Remaining balance' }}</td>
                        <td class="right">PHP {{ number_format($balance, 2) }}</td>
                    </tr>
                </tbody>
            </table>

            <div class="notice">
                Please settle the amount due on or before the due date to keep your account in good standing.
                Overpayments are automatically carried forward as credit on the next billing cycle.
            </div>

            @if($billing->notes)
                <p><strong>Notes:</strong> {{ $billing->notes }}</p>
            @endif

            <div class="remittance">
                <table class="layout-table">
                    <tr>
                        <td style="width: 55%;">
                            <div class="section-title">Payment Reference</div>
                            <div>Account No: <strong>{{ $accountNo }}</strong></div>
                            <div>Statement No: <strong>{{ $statementNo }}</strong></div>
                            <div>Tenant: <strong>{{ $billing->tenant?->full_name ?? 'Tenant #' . $billing->tenant_id }}</strong></div>
                        </td>
                        <td style="width: 45%;" class="right">
                            <div class="section-title">Amount Due</div>
                            <div style="font-size: 18px; font-weight: bold;">PHP {{ number_format($amountDue, 2) }}</div>
                            <div class="muted">Due {{ $billing->due_date?->format('M d, Y') ?? 'N/A' }}</div>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="footer">
                This is a system-generated rental billing statement. No signature is required.
            </div>
        </div>
    </div>
@endforeach
</body>
</html>
