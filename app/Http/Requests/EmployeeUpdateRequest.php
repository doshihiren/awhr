<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EmployeeUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $employeeId = $this->route('employee')?->id ?? $this->route('employee');

        return [
            'employee_code' => ['required', 'string', 'max:50', Rule::unique('employees', 'employee_code')->ignore($employeeId)],
            'name' => ['required', 'string', 'max:255'],
            'photo' => ['nullable', 'image', 'max:2048'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'dob' => ['nullable', 'date', 'before:today'],
            'joining_date' => ['required', 'date'],
            'department' => ['nullable', 'string', 'max:100'],
            'designation' => ['nullable', 'string', 'max:100'],
            'mobile' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'pan_number' => ['nullable', 'string', 'max:20', Rule::unique('employees', 'pan_number')->ignore($employeeId), 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
            'aadhaar_number' => ['nullable', 'string', 'max:20', 'regex:/^[0-9]{12}$/'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:50', 'regex:/^[0-9]{9,18}$/'],
            'ifsc' => ['nullable', 'string', 'max:20', 'regex:/^[A-Z]{4}0[A-Z0-9]{6}$/i'],
            'uan' => ['nullable', 'string', 'max:30'],
            'esic_number' => ['nullable', 'string', 'max:30'],
            'monthly_salary' => ['required', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'basic_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'hra_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'other_allowance_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
