<?php

namespace App\Http\Requests\Hotel;

use App\Models\HotelBooking;
use App\Models\HotelFacility;
use App\Models\HotelRoom;
use App\Models\HotelRoomPackage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class HotelBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'booking_target_type' => ['required', Rule::in(['room', 'facility'])],
            'hotel_room_id' => ['nullable', 'required_if:booking_target_type,room', 'exists:hotel_rooms,id'],
            'hotel_facility_id' => ['nullable', 'required_if:booking_target_type,facility', 'exists:hotel_facilities,id'],
            'hotel_room_package_id' => ['nullable', 'exists:hotel_room_packages,id'],
            'guest_name' => ['required', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'check_in_at' => ['required', 'date'],
            'check_out_at' => ['required', 'date', 'after:check_in_at'],
            'adults' => ['required', 'integer', 'min:1'],
            'children' => ['required', 'integer', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'additional_fees' => ['nullable', 'numeric', 'min:0'],
            'deposit_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_status' => ['required', Rule::in(['unpaid', 'partial', 'paid', 'refunded'])],
            'booking_status' => ['required', Rule::in(['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show'])],
            'notes' => ['nullable', 'string', 'max:3000'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $room = $this->input('booking_target_type') === 'room'
                    ? HotelRoom::find($this->input('hotel_room_id'))
                    : null;
                $facility = $this->input('booking_target_type') === 'facility'
                    ? HotelFacility::find($this->input('hotel_facility_id'))
                    : null;
                $target = $room ?: $facility;
                $label = $room ? 'room' : 'facility';
                $package = $this->input('hotel_room_package_id')
                    ? HotelRoomPackage::find($this->input('hotel_room_package_id'))
                    : null;

                if ($target && (int) $this->input('adults') > $target->max_adult_capacity) {
                    $validator->errors()->add('adults', "Adult count exceeds this {$label} capacity.");
                }

                if ($target && (int) $this->input('children') > $target->max_child_capacity) {
                    $validator->errors()->add('children', "Child count exceeds this {$label} capacity.");
                }

                if ($package && ! $this->packageMatchesTarget($package, $room, $facility)) {
                    $validator->errors()->add('hotel_room_package_id', "This package is not available for the selected {$label}.");
                }

                if (! in_array($this->input('booking_status'), ['pending', 'confirmed', 'checked-in'], true)) {
                    return;
                }

                $currentId = $this->route('hotelBooking')?->id;
                $conflict = HotelBooking::query()
                    ->when($room, fn ($query) => $query->where('hotel_room_id', $this->input('hotel_room_id')))
                    ->when($facility, fn ($query) => $query->where('hotel_facility_id', $this->input('hotel_facility_id')))
                    ->when($currentId, fn ($query) => $query->whereKeyNot($currentId))
                    ->blocking()
                    ->overlapping($this->input('check_in_at'), $this->input('check_out_at'))
                    ->exists();

                if ($conflict) {
                    $validator->errors()->add('check_in_at', "This {$label} already has a pending, confirmed, or checked-in booking in the selected date range.");
                }
            },
        ];
    }

    private function packageMatchesTarget(HotelRoomPackage $package, ?HotelRoom $room, ?HotelFacility $facility): bool
    {
        if ($room) {
            return ($package->hotel_room_id === null && $package->hotel_facility_id === null)
                || (int) $package->hotel_room_id === (int) $room->id;
        }

        if ($facility) {
            return ($package->hotel_room_id === null && $package->hotel_facility_id === null)
                || (int) $package->hotel_facility_id === (int) $facility->id;
        }

        return false;
    }
}
