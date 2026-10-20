'use strict';
// Read-only payroll preview. No database writes, migrations, or imports.
const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();
const HISTORICAL = {
  'Vishva Patel': [2,1.5,0.5,2.5,1,2.5],
  'Diya Shah': [4.5,1.5,1.5,2,1,3.5],
  'Ekta Patel': [4.5,3,2,3,2.5,3],
  'Kamal B': [null,3,4,0,1.5,3.5],
  'Narendra Kahar': [null,null,null,0,1,3],
  'Virti Mehta': [null,null,null,null,1,5]
};
function compute({salary, leave, paidLeave, month, year=2026, otherDeductions=0}) {
  const amount = Number(salary), paid = Number(paidLeave), deductions = Number(otherDeductions);
  const days = new Date(Number(year), Number(month), 0).getDate();
  if (!Number.isInteger(Number(month)) || month < 1 || month > 12 || !days ||
      ![amount,paid,deductions].every(Number.isFinite) || amount < 0 || paid < 0 || deductions < 0 ||
      typeof leave !== 'number' || !Number.isFinite(leave) || leave < 0 || paid > leave) {
    throw new Error('Invalid salary, leave, month or deductions');
  }
  const lop = Math.max(0,leave-paid);
  const lopDeduction = Math.round((amount / days) * lop * 100)/100;
  return {calendarDays:days, salary:amount, totalLeave:leave, paidLeave:paid, lop,
    lopDeduction, otherDeductions:deductions,
    netSalary:Math.round((amount-lopDeduction-deductions)*100)/100};
}
router.get('/historical-leaves',auth(['owner','hr']),(_req,res)=>{
  const records = Object.entries(HISTORICAL).flatMap(([employee,values])=>values.map((leave,index)=>({
    employee,year:2026,month:index+4,eligible:leave!==null,totalLeave:leave,
    defaultPaidLeave:leave===null?null:Math.min(1.5,leave),
    defaultLOP:leave===null?null:Math.max(0,leave-1.5)
  })));
  res.json({financialYear:'2026-27',previewOnly:true,imported:false,records});
});
router.post('/historical-payroll-preview',auth(['owner']), (req,res)=>{
  try { res.json({previewOnly:true,saved:false,...compute(req.body||{})}); }
  catch(e){res.status(400).json({message:e.message});}
});
module.exports=router;
module.exports.compute=compute;
