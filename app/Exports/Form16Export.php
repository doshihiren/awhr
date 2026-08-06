<?php

namespace App\Exports;

use App\Models\Employee;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class Form16Export implements FromArray, WithHeadings, WithTitle
{
    public function __construct(
        protected Employee $employee,
        protected string $financialYear,
        protected array $data
    ) {}

    public function array(): array
    {
        return [
            ['Employee Code', $this->employee->employee_code],
            ['Employee Name', $this->employee->name],
            ['PAN', $this->employee->pan_number],
            ['Financial Year', $this->financialYear],
            ['Salary Paid', $this->data['salary_paid']],
            ['Professional Tax', $this->data['professional_tax']],
            ['Other Deductions', $this->data['other_deductions']],
            ['TDS', $this->data['tds']],
            ['Taxable Income', $this->data['taxable_income']],
        ];
    }

    public function headings(): array
    {
        return ['Field', 'Value'];
    }

    public function title(): string
    {
        return 'Form 16';
    }
}
