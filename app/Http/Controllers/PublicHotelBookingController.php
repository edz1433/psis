<?php

namespace App\Http\Controllers;

use App\Http\Requests\Hotel\PublicHotelBookingRequest;
use App\Models\HotelBooking;
use App\Models\HotelFacility;
use App\Models\HotelRoom;
use App\Models\HotelRoomPackage;
use App\Models\SystemSetting;
use App\Services\HotelBookingPriceCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PublicHotelBookingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('PublicBooking/Index', [
            'title' => 'CPSU Rooms & Facilities Booking',
            'logoUrl' => SystemSetting::current()->logoUrl() ?: asset('images/cpsu-logo.png'),
            'rooms' => HotelRoom::with(['building.images', 'images', 'pricing', 'packages' => fn ($query) => $query->where('status', 'active')])
                ->where('status', 'available')
                ->orderBy('name')
                ->get(),
            'facilities' => HotelFacility::with(['images', 'packages' => fn ($query) => $query->where('status', 'active')])
                ->where('status', 'available')
                ->orderBy('name')
                ->get(),
            'packages' => HotelRoomPackage::where('status', 'active')->orderBy('name')->get(),
        ]);
    }

    public function calculate(Request $request, HotelBookingPriceCalculator $calculator): JsonResponse
    {
        $validated = $request->validate($this->availabilityRules() + [
            'hotel_room_package_id' => ['nullable', 'exists:hotel_room_packages,id'],
            'adults' => ['required', 'integer', 'min:1'],
            'children' => ['required', 'integer', 'min:0'],
        ]);

        $package = ! empty($validated['hotel_room_package_id'])
            ? HotelRoomPackage::find($validated['hotel_room_package_id'])
            : null;

        if ($package && ($package->status !== 'active' || ! $this->packageMatchesTarget($package, $validated))) {
            abort(422, 'This package is not available for the selected room or facility.');
        }

        return response()->json($calculator->calculate([
            ...$validated,
            'discount_amount' => 0,
            'additional_fees' => 0,
            'deposit_amount' => '',
        ]));
    }

    public function availability(Request $request): JsonResponse
    {
        $validated = $request->validate($this->availabilityRules());
        $isFacility = $validated['booking_target_type'] === 'facility';
        $target = $isFacility
            ? HotelFacility::find($validated['hotel_facility_id'])
            : HotelRoom::find($validated['hotel_room_id']);
        $label = $isFacility ? 'facility' : 'room';

        if (! $target || $target->status !== 'available') {
            return response()->json([
                'available' => false,
                'message' => "This {$label} is currently not available for booking.",
                'conflicts' => [],
            ]);
        }

        $conflicts = HotelBooking::query()
            ->when($isFacility, fn ($query) => $query->where('hotel_facility_id', $validated['hotel_facility_id']))
            ->when(! $isFacility, fn ($query) => $query->where('hotel_room_id', $validated['hotel_room_id']))
            ->whereIn('booking_status', ['pending', 'confirmed', 'checked-in'])
            ->overlapping($validated['check_in_at'], $validated['check_out_at'])
            ->orderBy('check_in_at')
            ->get(['check_in_at', 'check_out_at', 'booking_status'])
            ->map(fn (HotelBooking $booking) => [
                'check_in_at' => $booking->check_in_at?->format('M d, Y g:i A'),
                'check_out_at' => $booking->check_out_at?->format('M d, Y g:i A'),
                'booking_status' => $booking->booking_status,
            ])
            ->values();

        if ($conflicts->isNotEmpty()) {
            return response()->json([
                'available' => false,
                'message' => "This {$label} already has a pending or confirmed reservation for the selected date and time.",
                'conflicts' => $conflicts,
            ]);
        }

        return response()->json([
            'available' => true,
            'message' => "This {$label} is available for the selected date and time.",
            'conflicts' => [],
        ]);
    }

    private function availabilityRules(): array
    {
        return [
            'booking_target_type' => ['required', Rule::in(['room', 'facility'])],
            'hotel_room_id' => ['nullable', 'required_if:booking_target_type,room', 'exists:hotel_rooms,id'],
            'hotel_facility_id' => ['nullable', 'required_if:booking_target_type,facility', 'exists:hotel_facilities,id'],
            'check_in_at' => ['required', 'date'],
            'check_out_at' => ['required', 'date', 'after:check_in_at'],
        ];
    }

    private function packageMatchesTarget(HotelRoomPackage $package, array $data): bool
    {
        if (($data['booking_target_type'] ?? 'room') === 'facility') {
            return ($package->hotel_room_id === null && $package->hotel_facility_id === null)
                || (int) $package->hotel_facility_id === (int) ($data['hotel_facility_id'] ?? 0);
        }

        return ($package->hotel_room_id === null && $package->hotel_facility_id === null)
            || (int) $package->hotel_room_id === (int) ($data['hotel_room_id'] ?? 0);
    }

    public function store(PublicHotelBookingRequest $request, HotelBookingPriceCalculator $calculator): RedirectResponse
    {
        DB::transaction(function () use ($request, $calculator) {
            $validated = $request->validated();
            $this->assertNoActiveBookingConflict($validated);
            $calculated = $calculator->calculate([
                ...$validated,
                'discount_amount' => 0,
                'additional_fees' => 0,
                'deposit_amount' => '',
            ]);

            $booking = \App\Models\HotelBooking::create([
                'hotel_room_id' => $validated['booking_target_type'] === 'room' ? $validated['hotel_room_id'] : null,
                'hotel_facility_id' => $validated['booking_target_type'] === 'facility' ? $validated['hotel_facility_id'] : null,
                'hotel_room_package_id' => $validated['hotel_room_package_id'] ?? null,
                'guest_name' => $validated['guest_name'],
                'contact_number' => $validated['contact_number'],
                'email' => $validated['email'] ?? null,
                'check_in_at' => $validated['check_in_at'],
                'check_out_at' => $validated['check_out_at'],
                'adults' => $validated['adults'],
                'children' => $validated['children'],
                'discount_amount' => 0,
                'additional_fees' => 0,
                'deposit_amount' => $calculated['deposit_amount'],
                'total_amount' => $calculated['total_amount'],
                'payment_status' => 'unpaid',
                'booking_status' => 'pending',
                'notes' => $validated['notes'] ?? null,
            ]);

            $booking->charges()->createMany($calculated['charges']);
        });

        return back()->with('message', [
            'type' => 'success',
            'text' => 'Your booking request has been submitted. Please wait for admin confirmation.',
        ]);
    }

    private function assertNoActiveBookingConflict(array $data): void
    {
        $isFacility = $data['booking_target_type'] === 'facility';
        $label = $isFacility ? 'facility' : 'room';

        $conflict = HotelBooking::query()
            ->when($isFacility, fn ($query) => $query->where('hotel_facility_id', $data['hotel_facility_id']))
            ->when(! $isFacility, fn ($query) => $query->where('hotel_room_id', $data['hotel_room_id']))
            ->blocking()
            ->overlapping($data['check_in_at'], $data['check_out_at'])
            ->lockForUpdate()
            ->exists();

        if ($conflict) {
            throw ValidationException::withMessages([
                'check_in_at' => "This {$label} already has a pending or confirmed reservation in the selected date range.",
            ]);
        }
    }
}
