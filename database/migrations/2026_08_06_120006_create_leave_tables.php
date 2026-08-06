<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('financial_year', 9); // e.g. 2025-2026
            $table->decimal('opening_leave', 8, 2)->default(0);
            $table->decimal('leaves_earned', 8, 2)->default(0);
            $table->decimal('leaves_taken', 8, 2)->default(0);
            $table->decimal('current_balance', 8, 2)->default(0);
            $table->timestamps();

            $table->unique(['employee_id', 'financial_year']);
        });

        Schema::create('leave_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('leave_balance_id')->nullable()->constrained()->nullOnDelete();
            $table->string('financial_year', 9);
            $table->enum('type', ['opening', 'accrual', 'taken', 'adjustment', 'encashment'])->default('adjustment');
            $table->decimal('days', 8, 2);
            $table->date('transaction_date');
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'financial_year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_transactions');
        Schema::dropIfExists('leave_balances');
    }
};
