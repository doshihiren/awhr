<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->time('check_in')->nullable();
            $table->time('check_out')->nullable();
            $table->enum('status', ['present', 'absent', 'half_day', 'leave', 'holiday', 'week_off'])->default('present');
            $table->unsignedInteger('late_minutes')->default(0);
            $table->boolean('is_late')->default(false);
            $table->text('remarks')->nullable();
            $table->enum('source', ['checkin', 'manual', 'import'])->default('manual');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['employee_id', 'date']);
            $table->index(['date', 'status']);
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->unsignedTinyInteger('late_days')->default(0)->after('overtime_days');
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->time('office_start_time')->default('09:30:00')->after('pan');
            $table->unsignedSmallInteger('late_grace_minutes')->default(0)->after('office_start_time');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['office_start_time', 'late_grace_minutes']);
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn('late_days');
        });

        Schema::dropIfExists('attendance_days');
    }
};
