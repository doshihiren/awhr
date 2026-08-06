<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EmployeeStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_code' => ['required', 'string', 'max:50', 'unique:employees,employee_code'],
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
            'pan_number' => ['nullable', 'string', 'max:20', 'unique:employees,pan_number', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
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
            'opening_leave' => ['nullable', 'numeric'],
        ];
    }

    public function messages(): array
    {
        return [
            'pan_number.regex' => 'PAN must be in format ABCDE1234F.',
            'aadhaar_number.regex' => 'Aadhaar must be 12 digits.',
            'account_number.regex' => 'Bank account number must be 9–18 digits.',
            'ifsc.regex' => 'IFSC must be in format ABCD0123456.',
            'monthly_salary.min' => 'Salary cannot be negative.',
        ];
    }
}
