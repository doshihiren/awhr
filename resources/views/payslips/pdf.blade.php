<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Payslip - {{ $detail->employee->name }} - {{ $detail->payroll->period_label }}</title>
    <style>
        @page { margin: 28px; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #1f2937; font-family: DejaVu Sans, sans-serif; font-size: 11px; }
        .payslip { border: 1px solid #cbd5e1; padding: 24px; }
        .header { border-bottom: 3px solid #1e5a96; padding-bottom: 16px; margin-bottom: 18px; }
        .logo { float: left; max-width: 110px; max-height: 60px; margin-right: 14px; }
        .company-name { margin: 0 0 4px; color: #0d3d6b; font-size: 20px; }
        .company-meta { color: #64748b; line-height: 1.5; }
        .period { float: right; text-align: right; margin-top: 2px; }
        .period-label { color: #64748b; font-size: 9px; text-transform: uppercase; letter-spacing: .5px; }
        .period-value { color: #0d3d6b; font-size: 16px; font-weight: bold; }
        .clear { clear: both; }
        table { width: 100%; border-collapse: collapse; }
        .employee-table { margin-bottom: 18px; }
        .employee-table td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
        .employee-table .label { width: 18%; color: #64748b; }
        .employee-table .value { width: 32%; font-weight: bold; }
        .section-title { margin: 0; padding: 8px 10px; color: #fff; background: #1e5a96; font-size: 11px; text-transform: uppercase; }
        .column { width: 49%; vertical-align: top; }
        .spacer { width: 2%; }
        .money-table th, .money-table td { border: 1px solid #dbe3ec; padding: 8px; }
        .money-table th { background: #e8f1fa; color: #0d3d6b; text-align: left; }
        .money-table .amount { text-align: right; white-space: nowrap; }
        .money-table tfoot td { background: #f1f5f9; font-weight: bold; }
        .net { margin-top: 18px; padding: 12px 14px; color: #0d3d6b; background: #e8f1fa; border: 1px solid #9ec5e8; font-size: 14px; font-weight: bold; }
        .net-amount { float: right; font-size: 17px; }
        .summary { margin-top: 14px; color: #475569; }
        .summary td { width: 33.33%; padding: 7px; border: 1px solid #e2e8f0; text-align: center; }
        .signature { margin-top: 45px; width: 100%; }
        .signature td { width: 50%; vertical-align: bottom; }
        .signature .right { text-align: right; }
        .signature-img { max-width: 120px; max-height: 48px; }
        .signature-line { display: inline-block; width: 160px; border-top: 1px solid #64748b; padding-top: 5px; text-align: center; }
        .footer { margin-top: 22px; padding-top: 9px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px; text-align: center; }
    </style>
</head>
<body>
<div class="payslip">
    <div class="header">
        <div class="period">
            <div class="period-label">Payslip for</div>
            <div class="period-value">{{ $detail->payroll->period_label }}</div>
        </div>
        @if($company->logo && file_exists(public_path('uploads/logos/' . $company->logo)))
            <img src="{{ public_path('uploads/logos/' . $company->logo) }}" class="logo" alt="">
        @endif
        <h1 class="company-name">{{ $company->name }}</h1>
        <div class="company-meta">
            {{ $company->address }}<br>
            {{ $company->email }}@if($company->phone) · {{ $company->phone }}@endif
            @if($company->gstin)<br>GSTIN: {{ $company->gstin }}@endif
        </div>
        <div class="clear"></div>
    </div>

    <table class="employee-table">
        <tr>
            <td class="label">Employee</td><td class="value">{{ $detail->employee->name }}</td>
            <td class="label">Employee Code</td><td class="value">{{ $detail->employee->employee_code }}</td>
        </tr>
        <tr>
            <td class="label">Department</td><td class="value">{{ $detail->employee->department }}</td>
            <td class="label">Designation</td><td class="value">{{ $detail->employee->designation }}</td>
        </tr>
        <tr>
            <td class="label">Bank</td><td class="value">{{ $detail->employee->bank_name ?: '—' }}</td>
            <td class="label">Account No.</td><td class="value">{{ $detail->employee->account_number ?: '—' }}</td>
        </tr>
        <tr>
            <td class="label">PAN</td><td class="value">{{ $detail->employee->pan_number ?: '—' }}</td>
            <td class="label">Payment Date</td><td class="value">{{ $detail->paid_on?->format('d M Y') ?? 'Pending' }}</td>
        </tr>
    </table>

    <table>
        <tr>
            <td class="column">
                <div class="section-title">Earnings</div>
                <table class="money-table">
                    <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
                    <tbody>
                        <tr><td>Basic Salary</td><td class="amount">₹{{ number_format($detail->basic, 2) }}</td></tr>
                        <tr><td>House Rent Allowance</td><td class="amount">₹{{ number_format($detail->hra, 2) }}</td></tr>
                        <tr><td>Other Allowance</td><td class="amount">₹{{ number_format($detail->other_allowance, 2) }}</td></tr>
                    </tbody>
                    <tfoot><tr><td>Gross Earnings</td><td class="amount">₹{{ number_format($detail->earned_gross, 2) }}</td></tr></tfoot>
                </table>
            </td>
            <td class="spacer"></td>
            <td class="column">
                <div class="section-title">Deductions</div>
                <table class="money-table">
                    <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
                    <tbody>
                        <tr><td>Professional Tax</td><td class="amount">₹{{ number_format($detail->professional_tax, 2) }}</td></tr>
                        @foreach(['pf' => 'Provident Fund', 'esic' => 'ESIC', 'tds' => 'TDS', 'loan' => 'Loan', 'advance' => 'Advance', 'other_deduction' => 'Other Deduction'] as $field => $label)
                            @if((float) $detail->{$field} > 0)
                                <tr><td>{{ $label }}</td><td class="amount">₹{{ number_format($detail->{$field}, 2) }}</td></tr>
                            @endif
                        @endforeach
                    </tbody>
                    <tfoot><tr><td>Total Deductions</td><td class="amount">₹{{ number_format($detail->total_deductions, 2) }}</td></tr></tfoot>
                </table>
            </td>
        </tr>
    </table>

    <div class="net">
        Net Salary Payable
        <span class="net-amount">₹{{ number_format($detail->net_salary, 2) }}</span>
        <div class="clear"></div>
    </div>

    <table class="summary">
        <tr>
            <td>Attendance<br><strong>{{ $detail->present_days }} / {{ $detail->working_days }} days</strong></td>
            <td>LOP Days<br><strong>{{ $detail->lop_days }}</strong></td>
            <td>Leave Balance<br><strong>{{ number_format($detail->leave_balance, 2) }} days</strong></td>
        </tr>
    </table>

    <table class="signature">
        <tr>
            <td><span class="signature-line">Employee Signature</span></td>
            <td class="right">
                @if($company->signature && file_exists(public_path('uploads/signatures/' . $company->signature)))
                    <img src="{{ public_path('uploads/signatures/' . $company->signature) }}" class="signature-img" alt=""><br>
                @endif
                <span class="signature-line">Authorized Signatory</span>
            </td>
        </tr>
    </table>

    {{-- QR code placeholder: add digitally verifiable payslip QR code here in a future release. --}}
    <div class="footer">This is a computer-generated payslip and is confidential.</div>
</div>
</body>
</html>
