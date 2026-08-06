<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttendanceStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_id' => ['required', 'exists:employees,id'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'working_days' => ['required', 'integer', 'min:1', 'max:31'],
            'present_days' => ['required', 'integer', 'min:0', 'max:31'],
            'lop_days' => ['nullable', 'integer', 'min:0', 'max:31'],
            'overtime_days' => ['nullable', 'integer', 'min:0', 'max:31'],
            'late_days' => ['nullable', 'integer', 'min:0', 'max:31'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $working = (int) $this->input('working_days');
            $present = (int) $this->input('present_days');
            $lop = (int) ($this->input('lop_days') ?? 0);

            if ($present > $working) {
                $validator->errors()->add('present_days', 'Present days cannot exceed working days.');
            }
            if (($present + $lop) > $working) {
                $validator->errors()->add('lop_days', 'Present + LOP cannot exceed working days.');
            }
        });
    }
}
