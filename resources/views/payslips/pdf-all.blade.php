<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Payslips - {{ $payroll->period_label }}</title>
    <style>
        @page { margin: 25px; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #1f2937; font-family: DejaVu Sans, sans-serif; font-size: 10px; }
        .page { border: 1px solid #cbd5e1; padding: 22px; }
        .page-break { page-break-after: always; }
        .header { border-bottom: 3px solid #1e5a96; padding-bottom: 13px; margin-bottom: 15px; }
        .logo { float: left; max-width: 100px; max-height: 52px; margin-right: 12px; }
        .company-name { margin: 0 0 3px; color: #0d3d6b; font-size: 18px; }
        .meta { color: #64748b; line-height: 1.45; }
        .period { float: right; text-align: right; }
        .period strong { color: #0d3d6b; font-size: 15px; }
        .clear { clear: both; }
        table { width: 100%; border-collapse: collapse; }
        .employee { margin-bottom: 15px; }
        .employee td { padding: 5px 7px; border-bottom: 1px solid #e2e8f0; }
        .label { width: 18%; color: #64748b; }
        .value { width: 32%; font-weight: bold; }
        .column { width: 49%; vertical-align: top; }
        .gap { width: 2%; }
        .title { padding: 7px 8px; color: #fff; background: #1e5a96; font-weight: bold; text-transform: uppercase; }
        .money th, .money td { border: 1px solid #dbe3ec; padding: 7px; }
        .money th { color: #0d3d6b; background: #e8f1fa; text-align: left; }
        .money .amount { text-align: right; }
        .money tfoot td { background: #f1f5f9; font-weight: bold; }
        .net { margin-top: 15px; padding: 11px 13px; color: #0d3d6b; background: #e8f1fa; border: 1px solid #9ec5e8; font-size: 14px; font-weight: bold; }
        .net span { float: right; }
        .attendance { margin-top: 12px; }
        .attendance td { padding: 6px; border: 1px solid #e2e8f0; text-align: center; }
        .signatures { margin-top: 36px; }
        .signatures td { width: 50%; vertical-align: bottom; }
        .right { text-align: right; }
        .signature-img { max-width: 110px; max-height: 42px; }
        .line { display: inline-block; width: 145px; padding-top: 4px; border-top: 1px solid #64748b; text-align: center; }
        .footer { margin-top: 18px; padding-top: 7px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 8px; text-align: center; }
    </style>
</head>
<body>
@foreach($details as $detail)
    <div class="page">
        <div class="header">
            <div class="period"><span class="meta">PAYSLIP FOR</span><br><strong>{{ $payroll->period_label }}</strong></div>
            @if($company->logo && file_exists(public_path('uploads/logos/' . $company->logo)))
                <img src="{{ public_path('uploads/logos/' . $company->logo) }}" class="logo" alt="">
            @endif
            <h1 class="company-name">{{ $company->name }}</h1>
            <div class="meta">{{ $company->address }}<br>{{ $company->email }}@if($company->phone) · {{ $company->phone }}@endif</div>
            <div class="clear"></div>
        </div>

        <table class="employee">
            <tr><td class="label">Employee</td><td class="value">{{ $detail->employee->name }}</td><td class="label">Employee Code</td><td class="value">{{ $detail->employee->employee_code }}</td></tr>
            <tr><td class="label">Department</td><td class="value">{{ $detail->employee->department }}</td><td class="label">Designation</td><td class="value">{{ $detail->employee->designation }}</td></tr>
            <tr><td class="label">Bank</td><td class="value">{{ $detail->employee->bank_name ?: '—' }}</td><td class="label">Account No.</td><td class="value">{{ $detail->employee->account_number ?: '—' }}</td></tr>
            <tr><td class="label">PAN</td><td class="value">{{ $detail->employee->pan_number ?: '—' }}</td><td class="label">Payment Date</td><td class="value">{{ $detail->paid_on?->format('d M Y') ?? 'Pending' }}</td></tr>
        </table>

        <table>
            <tr>
                <td class="column">
                    <div class="title">Earnings</div>
                    <table class="money">
                        <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
                        <tbody>
                            <tr><td>Basic Salary</td><td class="amount">₹{{ number_format($detail->basic, 2) }}</td></tr>
                            <tr><td>House Rent Allowance</td><td class="amount">₹{{ number_format($detail->hra, 2) }}</td></tr>
                            <tr><td>Other Allowance</td><td class="amount">₹{{ number_format($detail->other_allowance, 2) }}</td></tr>
                        </tbody>
                        <tfoot><tr><td>Gross Earnings</td><td class="amount">₹{{ number_format($detail->earned_gross, 2) }}</td></tr></tfoot>
                    </table>
                </td>
                <td class="gap"></td>
                <td class="column">
                    <div class="title">Deductions</div>
                    <table class="money">
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

        <div class="net">Net Salary Payable <span>₹{{ number_format($detail->net_salary, 2) }}</span><div class="clear"></div></div>
        <table class="attendance"><tr><td>Attendance<br><strong>{{ $detail->present_days }} / {{ $detail->working_days }} days</strong></td><td>LOP Days<br><strong>{{ $detail->lop_days }}</strong></td><td>Leave Balance<br><strong>{{ number_format($detail->leave_balance, 2) }} days</strong></td></tr></table>
        <table class="signatures">
            <tr>
                <td><span class="line">Employee Signature</span></td>
                <td class="right">
                    @if($company->signature && file_exists(public_path('uploads/signatures/' . $company->signature)))
                        <img src="{{ public_path('uploads/signatures/' . $company->signature) }}" class="signature-img" alt=""><br>
                    @endif
                    <span class="line">Authorized Signatory</span>
                </td>
            </tr>
        </table>
        {{-- QR code placeholder: add digitally verifiable payslip QR code here in a future release. --}}
        <div class="footer">This is a computer-generated payslip and is confidential.</div>
    </div>
    @unless($loop->last)<div class="page-break"></div>@endunless
@endforeach
</body>
</html>
