<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Form 16 - {{ $employee->employee_code }} - {{ $fy }}</title>
    <style>
        @page { margin: 30px; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #1f2937; font-family: DejaVu Sans, sans-serif; font-size: 11px; }
        .document { border: 1px solid #94a3b8; padding: 24px; }
        .header { border-bottom: 3px solid #1e5a96; padding-bottom: 14px; margin-bottom: 18px; text-align: center; }
        .header h1 { margin: 0 0 5px; color: #0d3d6b; font-size: 21px; }
        .header h2 { margin: 0 0 7px; font-size: 15px; }
        .muted { color: #64748b; }
        .notice { margin-bottom: 16px; padding: 9px; background: #e8f1fa; border: 1px solid #b6d3ed; text-align: center; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; border: 1px solid #cbd5e1; }
        th { color: #0d3d6b; background: #e8f1fa; text-align: left; }
        .info { margin-bottom: 18px; }
        .info .label { width: 20%; color: #64748b; }
        .info .value { width: 30%; font-weight: bold; }
        .section-title { margin: 18px 0 0; padding: 8px 10px; color: #fff; background: #1e5a96; font-size: 12px; }
        .amount { text-align: right; white-space: nowrap; }
        .total td { color: #0d3d6b; background: #f1f5f9; font-weight: bold; }
        .declaration { margin-top: 20px; line-height: 1.6; text-align: justify; }
        .signatures { margin-top: 55px; }
        .signatures td { width: 50%; border: 0; vertical-align: bottom; }
        .right { text-align: right; }
        .line { display: inline-block; width: 175px; padding-top: 5px; border-top: 1px solid #64748b; text-align: center; }
        .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #cbd5e1; color: #94a3b8; font-size: 9px; text-align: center; }
    </style>
</head>
<body>
<div class="document">
    <div class="header">
        <h1>FORM NO. 16</h1>
        <h2>Certificate of Salary and Tax Deductions</h2>
        <div class="muted">Financial Year {{ $fy }}</div>
    </div>

    <div class="notice">Consolidated salary statement issued by {{ $company->name }}</div>

    <table class="info">
        <tr>
            <td class="label">Employer</td><td class="value">{{ $company->name }}</td>
            <td class="label">Employer PAN</td><td class="value">{{ $company->pan ?: '—' }}</td>
        </tr>
        <tr>
            <td class="label">Employer Address</td><td class="value">{{ $company->address ?: '—' }}</td>
            <td class="label">GSTIN</td><td class="value">{{ $company->gstin ?: '—' }}</td>
        </tr>
        <tr>
            <td class="label">Employee</td><td class="value">{{ $employee->name }}</td>
            <td class="label">Employee Code</td><td class="value">{{ $employee->employee_code }}</td>
        </tr>
        <tr>
            <td class="label">Employee PAN</td><td class="value">{{ $employee->pan_number ?: '—' }}</td>
            <td class="label">Period</td><td class="value">{{ $data['period_start']->format('d M Y') }} to {{ $data['period_end']->format('d M Y') }}</td>
        </tr>
    </table>

    <div class="section-title">Part A — Salary and Deduction Summary</div>
    <table>
        <thead><tr><th>Particulars</th><th class="amount">Amount</th></tr></thead>
        <tbody>
            <tr><td>Gross salary paid</td><td class="amount">₹{{ number_format($data['salary_paid'], 2) }}</td></tr>
            <tr><td>Professional tax</td><td class="amount">₹{{ number_format($data['professional_tax'], 2) }}</td></tr>
            <tr><td>Other deductions</td><td class="amount">₹{{ number_format($data['other_deductions'], 2) }}</td></tr>
            <tr><td>Tax deducted at source (TDS)</td><td class="amount">₹{{ number_format($data['tds'], 2) }}</td></tr>
            <tr class="total"><td>Taxable income</td><td class="amount">₹{{ number_format($data['taxable_income'], 2) }}</td></tr>
        </tbody>
    </table>

    <div class="section-title">Part B — Monthly Salary Details</div>
    <table>
        <thead>
            <tr><th>Month</th><th class="amount">Gross</th><th class="amount">Professional Tax</th><th class="amount">TDS</th><th class="amount">Net Salary</th></tr>
        </thead>
        <tbody>
            @forelse($data['monthly_details'] as $detail)
                <tr>
                    <td>{{ $detail->payroll->period_label }}</td>
                    <td class="amount">₹{{ number_format($detail->earned_gross, 2) }}</td>
                    <td class="amount">₹{{ number_format($detail->professional_tax, 2) }}</td>
                    <td class="amount">₹{{ number_format($detail->tds, 2) }}</td>
                    <td class="amount">₹{{ number_format($detail->net_salary, 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="5" style="text-align:center">No payroll records for this financial year.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="declaration">
        I certify that the above information is based on payroll records maintained by the employer and is true and correct to the best of our knowledge.
    </div>

    <table class="signatures">
        <tr>
            <td><span class="line">Date and Place</span></td>
            <td class="right"><span class="line">Authorized Signatory</span></td>
        </tr>
    </table>
    <div class="footer">This statement is generated electronically by AWHR Payroll Management.</div>
</div>
</body>
</html>
