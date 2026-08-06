<?php

namespace App\Exports;

use App\Models\Payroll;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;

class BankTransferExport implements FromCollection, WithHeadings, WithMapping, WithTitle
{
    public function __construct(protected Payroll $payroll) {}

    public function collection()
    {
        return $this->payroll->details;
    }

    public function headings(): array
    {
        return ['Employee Name', 'Account Number', 'IFSC', 'Net Salary'];
    }

    public function map($detail): array
    {
        return [
            $detail->employee->name,
            $detail->employee->account_number,
            $detail->employee->ifsc,
            $detail->net_salary,
        ];
    }

    public function title(): string
    {
        return 'Bank Transfer';
    }
}
