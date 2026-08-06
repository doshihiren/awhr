<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payrolls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('month');
            $table->unsignedSmallInteger('year');
            $table->string('financial_year', 9);
            $table->enum('status', ['draft', 'calculated', 'frozen', 'approved', 'locked'])->default('draft');
            $table->unsignedInteger('total_employees')->default(0);
            $table->decimal('total_gross', 14, 2)->default(0);
            $table->decimal('total_deductions', 14, 2)->default(0);
            $table->decimal('total_net', 14, 2)->default(0);
            $table->timestamp('calculated_at')->nullable();
            $table->timestamp('frozen_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('locked_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'month', 'year']);
        });

        Schema::create('payroll_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('attendance_id')->nullable()->constrained()->nullOnDelete();

            // Attendance snapshot
            $table->unsignedTinyInteger('working_days')->default(0);
            $table->unsignedTinyInteger('present_days')->default(0);
            $table->unsignedTinyInteger('lop_days')->default(0);

            // Earnings
            $table->decimal('monthly_gross', 12, 2)->default(0);
            $table->decimal('basic', 12, 2)->default(0);
            $table->decimal('hra', 12, 2)->default(0);
            $table->decimal('other_allowance', 12, 2)->default(0);
            $table->decimal('earned_gross', 12, 2)->default(0); // after attendance proration

            // Deductions
            $table->decimal('professional_tax', 12, 2)->default(0);
            $table->decimal('pf', 12, 2)->default(0);
            $table->decimal('esic', 12, 2)->default(0);
            $table->decimal('tds', 12, 2)->default(0);
            $table->decimal('loan', 12, 2)->default(0);
            $table->decimal('advance', 12, 2)->default(0);
            $table->decimal('other_deduction', 12, 2)->default(0);
            $table->decimal('total_deductions', 12, 2)->default(0);

            $table->decimal('net_salary', 12, 2)->default(0);
            $table->decimal('leave_balance', 8, 2)->nullable();

            $table->boolean('is_paid')->default(false);
            $table->date('paid_on')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->unique(['payroll_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_details');
        Schema::dropIfExists('payrolls');
    }
};
