'use strict';
const MINUTES = 60;
function monthDays(year,month){
  const y=Number(year),m=Number(month);
  if (!Number.isInteger(y)||y<2020||y>2100||!Number.isInteger(m)||m<1||m>12) throw new Error('Invalid month');
  return new Date(Date.UTC(y,m,0)).getUTCDate();
}
function minutes(t){
  if (typeof t!=='string'||!/^\d{2}:\d{2}(?::\d{2})?$/.test(t))return null;
  const [h,m]=t.split(':').map(Number);
  return h<24&&m<60?h*60+m:null;
}
function hoursText(n){if(n==null)return '—';return Math.floor(n/60)+'h '+String(Math.round(n%60)).padStart(2,'0')+'m';}
function attendanceSummary(row,events=[],rules={}){
  const start=minutes(row?.check_in?.slice(0,8)),end=minutes(row?.check_out?.slice(0,8));
  const at=kind=>events.find(x=>x.kind===kind)?.time?.slice(0,8)||null;
  const lOut=minutes(at('lunch_out')),lIn=minutes(at('lunch_in'));
  const lunch=lOut!==null&&lIn!==null&&lIn>=lOut?lIn-lOut:null;
  const gross=start!==null&&end!==null&&end>=start?end-start:null;
  const lunchComplete=lOut!==null&&lIn!==null&&lIn>=lOut;
  const net=gross===null||!lunchComplete?null:Math.max(0,gross-lunch);
  const flags=[];
  if(start!==null&&start>minutes(rules.lateAfter||'10:15'))flags.push({key:'late_in',label:'Late IN',points:2});
  if(end!==null&&end<minutes(rules.earlyBefore||'19:00'))flags.push({key:'early_out',label:'Early OUT',points:2});
  if(lunch!==null&&lunch>Number(rules.maxLunch||45))flags.push({key:'long_lunch',label:'Lunch over 45m',points:1});
  if(gross!==null&&!lunchComplete)flags.push({key:'missing_lunch',label:'Lunch punches missing',points:0});
  if(net!==null&&net<Number(rules.requiredMinutes||480))flags.push({key:'short_hours',label:'Less than 8h',points:2});
  if(start!==null&&end===null&&row?.date&&row.date<new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}))flags.push({key:'missing_out',label:'Missing OUT',points:1});
  return {check_in:row?.check_in||null,check_out:row?.check_out||null,lunch_out:at('lunch_out'),lunch_in:at('lunch_in'),lunchMinutes:lunch,netMinutes:net,grossMinutes:gross,flags,possiblePointsLost:flags.reduce((n,x)=>n+x.points,0)};
}
function historicalPay({salary,totalLeave,paidLeave,year,month,otherDeductions=0}){
  const days=monthDays(year,month),amount=Number(salary),taken=Number(totalLeave),paid=Number(paidLeave),other=Number(otherDeductions);
  if (![amount,taken,paid,other].every(Number.isFinite)||amount<0||taken<0||paid<0||paid>taken||other<0)throw new Error('Invalid payroll amounts');
  const lop=Math.max(0,taken-paid);
  const deduction=Math.round(amount*lop/days*100)/100;
  return {calendarDays:days,salary:amount,totalLeave:taken,paidLeave:paid,lop,lopDeduction:deduction,otherDeductions:other,estimatedNet:Math.round((amount-deduction-other)*100)/100};
}
const defaultHistoricalPaid=n=>Math.min(1.5,Math.max(0,Number(n)||0));
function earnedBalance({opening,accrualMonths,approvedDays,adjustments=0}){
  const vals=[opening,accrualMonths,approvedDays,adjustments].map(Number);
  if(!vals.every(Number.isFinite)||vals[1]<0||vals[2]<0)throw new Error('Invalid leave balance');
  return Math.round((vals[0]+vals[1]*1.5-vals[2]+vals[3])*100)/100;
}
module.exports={monthDays,minutes,hoursText,attendanceSummary,historicalPay,defaultHistoricalPaid,earnedBalance};