<?php

namespace App\Http\Requests\Hotel;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class HotelRoomPackageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'hotel_room_id' => ['nullable', 'exists:hotel_rooms,id'],
            'hotel_facility_id' => ['nullable', 'exists:hotel_facilities,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:3000'],
            'included_adults' => ['required', 'integer', 'min:1'],
            'included_children' => ['required', 'integer', 'min:0'],
            'duration_value' => ['required', 'integer', 'min:1'],
            'duration_unit' => ['required', Rule::in(['hour', 'day', 'night'])],
            'price' => ['required', 'numeric', 'min:0'],
            'extra_adult_charge' => ['nullable', 'numeric', 'min:0'],
            'extra_child_charge' => ['nullable', 'numeric', 'min:0'],
            'inclusions' => ['nullable', 'array'],
            'inclusions.*' => ['string', 'max:255'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ];
    }
}
