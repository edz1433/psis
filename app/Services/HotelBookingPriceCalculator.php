<?php

namespace App\Services;

use App\Models\HotelFacility;
use App\Models\HotelRoom;
use App\Models\HotelRoomPackage;
use Carbon\Carbon;

class HotelBookingPriceCalculator
{
    public function calculate(array $data): array
    {
        $isFacility = ($data['booking_target_type'] ?? 'room') === 'facility';
        $target = $isFacility
            ? HotelFacility::findOrFail($data['hotel_facility_id'])
            : HotelRoom::with('pricing')->findOrFail($data['hotel_room_id']);
        $package = ! empty($data['hotel_room_package_id'])
            ? HotelRoomPackage::find($data['hotel_room_package_id'])
            : null;

        $checkIn = Carbon::parse($data['check_in_at']);
        $checkOut = Carbon::parse($data['check_out_at']);
        $pricing = $isFacility ? $target : $target->pricing;
        $adults = (int) ($data['adults'] ?? 1);
        $children = (int) ($data['children'] ?? 0);
        $discount = (float) ($data['discount_amount'] ?? 0);
        $manualFees = (float) ($data['additional_fees'] ?? 0);
        $depositOverride = $data['deposit_amount'] ?? null;

        $charges = [];
        $includedAdults = $target->base_capacity;
        $includedChildren = 0;
        $baseAmount = 0;

        if ($package) {
            $includedAdults = $package->included_adults;
            $includedChildren = $package->included_children;
            $baseAmount = (float) $package->price;
            $charges[] = $this->line($package->name, 'package', 1, $baseAmount);
        } else {
            $units = $this->billableUnits($checkIn, $checkOut, $pricing?->price_type ?? 'per_night');
            $unitPrice = (float) ($pricing?->base_price ?? 0);
            $baseAmount = $units * $unitPrice;
            $charges[] = $this->line($this->baseLabel($pricing?->price_type ?? 'per_night', $isFacility), $isFacility ? 'facility_rate' : 'room_rate', $units, $unitPrice);
        }

        $extraAdults = max(0, $adults - $includedAdults);
        $extraChildren = max(0, $children - $includedChildren);
        $extraAdultRate = (float) ($package?->extra_adult_charge ?? $pricing?->extra_adult_price ?? 0);
        $extraChildRate = (float) ($package?->extra_child_charge ?? $pricing?->extra_child_price ?? 0);

        if ($extraAdults > 0 && $extraAdultRate > 0) {
            $charges[] = $this->line('Extra adults', 'extra_adult', $extraAdults, $extraAdultRate);
        }

        if ($extraChildren > 0 && $extraChildRate > 0) {
            $charges[] = $this->line('Extra children', 'extra_child', $extraChildren, $extraChildRate);
        }

        if ($pricing?->cleaning_fee > 0) {
            $charges[] = $this->line('Cleaning fee', 'fee', 1, (float) $pricing->cleaning_fee);
        }

        foreach (($pricing?->other_fees ?? []) as $fee) {
            $label = $fee['label'] ?? 'Other fee';
            $amount = (float) ($fee['amount'] ?? 0);
            if ($amount > 0) {
                $charges[] = $this->line($label, 'fee', 1, $amount);
            }
        }

        if ($manualFees > 0) {
            $charges[] = $this->line('Additional fees', 'fee', 1, $manualFees);
        }

        $deposit = $depositOverride !== null && $depositOverride !== ''
            ? (float) $depositOverride
            : (float) ($pricing?->security_deposit ?? 0);

        if ($deposit > 0) {
            $charges[] = $this->line('Security deposit', 'deposit', 1, $deposit);
        }

        if ($discount > 0) {
            $charges[] = $this->line('Discount', 'discount', 1, -1 * $discount);
        }

        $total = collect($charges)->sum('amount');

        return [
            'total_amount' => max(0, round($total, 2)),
            'deposit_amount' => round($deposit, 2),
            'extra_adults' => $extraAdults,
            'extra_children' => $extraChildren,
            'charges' => $charges,
        ];
    }

    private function billableUnits(Carbon $checkIn, Carbon $checkOut, string $priceType): int
    {
        return match ($priceType) {
            'per_hour' => max(1, (int) ceil($checkIn->diffInMinutes($checkOut) / 60)),
            'per_day' => max(1, (int) ceil($checkIn->diffInHours($checkOut) / 24)),
            default => max(1, (int) ceil($checkIn->diffInHours($checkOut) / 24)),
        };
    }

    private function baseLabel(string $priceType, bool $isFacility = false): string
    {
        $target = $isFacility ? 'Facility' : 'Room';

        return match ($priceType) {
            'per_hour' => "{$target} rate per hour",
            'per_day' => "{$target} rate per day",
            default => "{$target} rate per night",
        };
    }

    private function line(string $label, string $type, int $quantity, float $unitAmount): array
    {
        return [
            'label' => $label,
            'type' => $type,
            'quantity' => $quantity,
            'unit_amount' => round($unitAmount, 2),
            'amount' => round($quantity * $unitAmount, 2),
        ];
    }
}
