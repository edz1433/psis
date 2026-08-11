<?php

namespace App\Http\Requests\Hotel;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class HotelFacilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'facility_type' => ['required', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:3000'],
            'max_adult_capacity' => ['required', 'integer', 'min:1'],
            'max_child_capacity' => ['required', 'integer', 'min:0'],
            'base_capacity' => ['required', 'integer', 'min:1', 'lte:max_adult_capacity'],
            'status' => ['required', Rule::in(['available', 'unavailable', 'maintenance', 'inactive'])],
            'base_price' => ['nullable', 'numeric', 'min:0'],
            'price_type' => ['required', Rule::in(['per_hour', 'per_day'])],
            'weekend_price' => ['nullable', 'numeric', 'min:0'],
            'holiday_price' => ['nullable', 'numeric', 'min:0'],
            'extra_adult_price' => ['nullable', 'numeric', 'min:0'],
            'extra_child_price' => ['nullable', 'numeric', 'min:0'],
            'child_age_rule' => ['nullable', 'string', 'max:255'],
            'security_deposit' => ['nullable', 'numeric', 'min:0'],
            'cleaning_fee' => ['nullable', 'numeric', 'min:0'],
            'other_fees' => ['nullable', 'array'],
            'rules_notes' => ['nullable', 'string', 'max:3000'],
            'images' => ['nullable', 'array'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ];
    }
}
