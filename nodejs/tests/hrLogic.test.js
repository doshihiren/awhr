'use strict';
const t=require('node:test'),assert=require('node:assert/strict');
const {monthDays,attendanceSummary,historicalPay,earnedBalance,defaultHistoricalPaid}=require('../lib/hrLogic');
t('calendar days, including leap year',()=>{assert.equal(monthDays(2026,2),28);assert.equal(monthDays(2028,2),29);assert.equal(monthDays(2026,5),31)});
t('historical LOP uses month divisor',()=>{const a=historicalPay({salary:12000,totalLeave:3,paidLeave:1.5,year:2026,month:4});assert.equal(a.lop,1.5);assert.equal(a.estimatedNet,11400);const b=historicalPay({salary:12000,totalLeave:3,paidLeave:1.5,year:2026,month:5});assert.equal(b.lopDeduction,580.65)});
t('paid leave capped at 1.5',()=>assert.equal(defaultHistoricalPaid(3.5),1.5));
t('attendance subtracts lunch and reports exceptions',()=>{const a=attendanceSummary({check_in:'10:32:00',check_out:'18:40:00'},[{kind:'lunch_out',time:'13:00:00'},{kind:'lunch_in',time:'13:55:00'}]);assert.equal(a.lunchMinutes,55);assert.equal(a.netMinutes,433);assert.deepEqual(a.flags.map(f=>f.key),['late_in','early_out','long_lunch','short_hours']);});
t('opening earned leave calculation',()=>assert.equal(earnedBalance({opening:2,accrualMonths:2,approvedDays:1.5}),3.5));
t('rejects invalid payroll',()=>assert.throws(()=>historicalPay({salary:100,totalLeave:1,paidLeave:2,year:2026,month:4})));