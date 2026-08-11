<?php

namespace App\Http\Requests\Hotel;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class HotelRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'hotel_building_id' => ['required', 'exists:hotel_buildings,id'],
            'name' => ['required', 'string', 'max:255'],
            'room_type' => ['nullable', 'string', 'max:100'],
            'floor_number' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:3000'],
            'max_adult_capacity' => ['required', 'integer', 'min:1'],
            'max_child_capacity' => ['required', 'integer', 'min:0'],
            'base_capacity' => ['required', 'integer', 'min:1', 'lte:max_adult_capacity'],
            'status' => ['required', Rule::in(['available', 'unavailable', 'maintenance', 'inactive'])],
            'rules_notes' => ['nullable', 'string', 'max:3000'],
            'amenity_ids' => ['nullable', 'array'],
            'amenity_ids.*' => ['integer', 'exists:hotel_amenities,id'],
            'images' => ['nullable', 'array'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'pricing.base_price' => ['nullable', 'numeric', 'min:0'],
            'pricing.price_type' => ['nullable', Rule::in(['per_night', 'per_hour', 'per_day'])],
            'pricing.weekend_price' => ['nullable', 'numeric', 'min:0'],
            'pricing.holiday_price' => ['nullable', 'numeric', 'min:0'],
            'pricing.extra_adult_price' => ['nullable', 'numeric', 'min:0'],
            'pricing.extra_child_price' => ['nullable', 'numeric', 'min:0'],
            'pricing.child_age_rule' => ['nullable', 'string', 'max:255'],
            'pricing.security_deposit' => ['nullable', 'numeric', 'min:0'],
            'pricing.cleaning_fee' => ['nullable', 'numeric', 'min:0'],
            'pricing.other_fees' => ['nullable', 'array'],
            'pricing.other_fees.*.label' => ['required_with:pricing.other_fees', 'string', 'max:100'],
            'pricing.other_fees.*.amount' => ['required_with:pricing.other_fees', 'numeric', 'min:0'],
        ];
    }
}
