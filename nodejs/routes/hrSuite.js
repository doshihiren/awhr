'use strict';
const router=require('express').Router();
const db=require('../db/db');
const auth=require('../middleware/auth');
const logic=require('../lib/hrLogic');
const ADMIN=['owner','admin'];
const ADMIN_WRITE=['admin'];
const REVIEW=['owner','admin','hr'];
const todayIST=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
const timeIST=()=>new Date().toLocaleTimeString('en-GB',{timeZone:'Asia/Kolkata',hour12:false});
const isAdmin=u=>ADMIN.includes(u.role);
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(e=>{
  console.error('HR suite request failed',e.code||e.message);
  if(e.code==='ER_NO_SUCH_TABLE')return res.status(503).json({message:'HR Suite migration pending. Ask Owner/Admin to complete the reviewed database migration.'});
  if(e.code==='ER_DUP_ENTRY')return res.status(409).json({message:'This entry already exists.'});
  res.status(500).json({message:'Unable to complete the request. Please try again or contact Admin.'});
});
function ymon(req){const year=Number(req.query.year||2026),month=Number(req.query.month||new Date().getMonth()+1);logic.monthDays(year,month);return {year,month};}
function bad(res,msg){return res.status(400).json({message:msg});}
function roleUser(u){return {id:u.id,name:u.name,email:u.email,role:u.role,avatar:u.avatar};}
function checkMonth(v){return /^20\d\d-(0[1-9]|1[0-2])-01$/.test(v);}
async function audit(conn,actor,uid,action,key,details={}){
  await conn.query('INSERT INTO hrx_audit_log(actor_id,user_id,action,record_key,details_json) VALUES (?,?,?,?,?)',
    [actor,uid,action,key,JSON.stringify(details)]);
}
async function staff(activeOnly=true){
  const [rows]=await db.query(`SELECT u.id,u.name,u.email,u.role,u.avatar,u.phone,
    e.department,e.designation,e.date_of_joining,
    COALESCE(ed.status,'active') emp_status,ed.resignation_date
    FROM users u LEFT JOIN employees e ON e.user_id=u.id
    LEFT JOIN employee_details ed ON ed.user_id=u.id
    WHERE u.role IN ('team','hr') ${activeOnly?"AND COALESCE(ed.status,'active') NOT IN ('resigned','inactive','terminated')":''}
    ORDER BY u.name`);
  return rows;
}
async function eventsFor(userIds,year,month){
  if(!userIds.length)return [];
  const [rows]=await db.query(`SELECT user_id,event_date,kind,TIME_FORMAT(at_time,'%H:%i:%s') time
  FROM hrx_punch_events WHERE YEAR(event_date)=? AND MONTH(event_date)=? AND user_id IN (${userIds.map(()=>'?').join(',')})`,[year,month,...userIds]);
  return rows;
}
function pack(rows,events){
  return rows.map(row=>{const filtered=events.filter(e=>Number(e.user_id)===Number(row.user_id)&&String(e.event_date)===String(row.date));return {...row,summary:logic.attendanceSummary(row,filtered)};});
}
router.get('/session',auth(),asyncRoute(async(req,res)=>{
  const [[u]]=await db.query('SELECT id,name,email,role,avatar FROM users WHERE id=?',[req.user.id]);
  if(!u)return res.status(401).json({message:'Account no longer available'});
  res.json({user:roleUser(u),canReview:REVIEW.includes(u.role),canManage:isAdmin(u),payrollRestricted:true});
}));
router.get('/staff',auth(REVIEW),asyncRoute(async(req,res)=>res.json(await staff(req.query.archive!=='1'))));
router.patch('/admin/staff/:id/status',auth(ADMIN_WRITE),asyncRoute(async(req,res)=>{
  const uid=Number(req.params.id),status=req.body?.status;
  if(!Number.isInteger(uid)||uid<=0||!['active','resigned'].includes(status))return bad(res,'Select a valid employee and status');
  if(uid===Number(req.user.id))return bad(res,'Cannot archive your own login');
  const [[u]]=await db.query('SELECT id,role FROM users WHERE id=?',[uid]);
  if(!u||!['hr','team'].includes(u.role))return bad(res,'Employee not found');
  const conn=await db.getConnection();
  try{await conn.beginTransaction();
    await conn.query('INSERT INTO employee_details(user_id,status) VALUES (?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)',[uid,status]);
    await audit(conn,req.user.id,uid,'employee_status',String(uid),{status});
    await conn.commit();res.json({message:status==='resigned'?'Employee archived. Historical data preserved.':'Employee returned to active roster.'});
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}));
router.get('/attendance/monthly',auth(REVIEW),asyncRoute(async(req,res)=>{
  const {year,month}=ymon(req),people=await staff(req.query.archive!=='1');
  const ids=people.map(x=>x.id);
  if(!ids.length)return res.json({people,records:[],year,month});
  const [rows]=await db.query(`SELECT user_id,date,check_in,check_out,status,method FROM attendance
    WHERE YEAR(date)=? AND MONTH(date)=? AND user_id IN (${ids.map(()=>'?').join(',')}) ORDER BY date DESC`,[year,month,...ids]);
  const events=await eventsFor(ids,year,month);
  res.json({people,records:pack(rows,events),year,month});
}));
router.get('/attendance/my',auth(),asyncRoute(async(req,res)=>{
  const {year,month}=ymon(req);
  const [rows]=await db.query('SELECT user_id,date,check_in,check_out,status,method FROM attendance WHERE user_id=? AND YEAR(date)=? AND MONTH(date)=? ORDER BY date DESC',[req.user.id,year,month]);
  const events=await eventsFor([req.user.id],year,month);
  res.json({records:pack(rows,events),year,month});
}));
router.get('/attendance/today',auth(),asyncRoute(async(req,res)=>{
  const d=todayIST();
  const [[record]]=await db.query('SELECT user_id,date,check_in,check_out,status,method FROM attendance WHERE user_id=? AND date=?',[req.user.id,d]);
  const [events]=await db.query("SELECT kind,TIME_FORMAT(at_time,'%H:%i:%s') time FROM hrx_punch_events WHERE user_id=? AND event_date=? ORDER BY at_time",[req.user.id,d]);
  res.json({date:d,record:record?{...record,summary:logic.attendanceSummary(record,events)}:null,events});
}));
router.post('/attendance/punch',auth(),asyncRoute(async(req,res)=>{
  const kind=String(req.body?.kind||'');
  if(!['in','lunch_out','lunch_in','out'].includes(kind))return bad(res,'Unknown punch action');
  const uid=req.user.id,d=todayIST(),clock=timeIST(),conn=await db.getConnection();
  try{
    await conn.beginTransaction();
    const [[employee]]=await conn.query("SELECT status FROM employee_details WHERE user_id=? LIMIT 1",[uid]);
    if(employee&&['resigned','inactive','terminated'].includes(employee.status)){await conn.rollback();return res.status(403).json({message:'Attendance is unavailable for archived employees'});}
    const [[row]]=await conn.query('SELECT check_in,check_out,status FROM attendance WHERE user_id=? AND date=? FOR UPDATE',[uid,d]);
    const [events]=await conn.query('SELECT kind FROM hrx_punch_events WHERE user_id=? AND event_date=? FOR UPDATE',[uid,d]);
    const has=k=>events.some(e=>e.kind===k);
    if(kind==='in'&&row?.check_in){await conn.rollback();return res.status(409).json({message:'You are already checked in today'});}
    if(kind!=='in'&&!row?.check_in){await conn.rollback();return res.status(409).json({message:'Please check IN before using this action'});}
    if(kind!=='in'&&row?.check_out){await conn.rollback();return res.status(409).json({message:'Your day has already been checked OUT'});}
    if(kind==='lunch_out'&&has('lunch_out')||kind==='lunch_in'&&(!has('lunch_out')||has('lunch_in'))||kind==='out'&&has('lunch_out')&&!has('lunch_in')){
      await conn.rollback();return res.status(409).json({message:kind==='out'?'Please complete Lunch IN or ask Admin to regularize your attendance':'This lunch action is not available in the current sequence'});
    }
    if(kind==='in'){
      if(row){await conn.query("UPDATE attendance SET check_in=?,status='present',method='self' WHERE user_id=? AND date=?",[clock,uid,d]);}
      else await conn.query("INSERT INTO attendance (user_id,date,check_in,status,method) VALUES (?,?,?,'present','self')",[uid,d,clock]);
    }
    if(kind==='out'){
      const eventRows=await conn.query("SELECT kind,TIME_FORMAT(at_time,'%H:%i:%s') time FROM hrx_punch_events WHERE user_id=? AND event_date=?",[uid,d]);
      const summarized=logic.attendanceSummary({check_in:row.check_in,check_out:clock},eventRows[0]);
      const next=summarized.netMinutes!==null&&summarized.netMinutes<360?'half_day_second':'present';
      await conn.query('UPDATE attendance SET check_out=?,status=? WHERE user_id=? AND date=?',[clock,next,uid,d]);
    }
    await conn.query("INSERT INTO hrx_punch_events (user_id,event_date,kind,at_time,source,recorded_by) VALUES (?,?,?,?,'self',?)",[uid,d,kind,clock,uid]);
    await audit(conn,uid,uid,'punch',`${d}/${kind}`,{time:clock});
    await conn.commit();res.json({message:'Attendance recorded',date:d,kind,time:clock});
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}));
router.get('/discipline',auth(REVIEW),asyncRoute(async(req,res)=>{
  const {year,month}=ymon(req),people=await staff();
  const ids=people.map(e=>e.id);
  if(!ids.length)return res.json({year,month,people:[],rows:[]});
  const [rows]=await db.query(`SELECT user_id,date,check_in,check_out,status FROM attendance WHERE YEAR(date)=? AND MONTH(date)=? AND user_id IN (${ids.map(()=>'?').join(',')})`,[year,month,...ids]);
  const packed=pack(rows,await eventsFor(ids,year,month));
  const summaries=people.map(p=>{const mine=packed.filter(x=>Number(x.user_id)===Number(p.id)),flags=mine.flatMap(x=>x.summary.flags.map(f=>({...f,date:x.date})));return {id:p.id,name:p.name,department:p.department,recordedDays:mine.length,flaggedDays:new Set(flags.map(f=>f.date)).size,flags,provisionalScore:Math.max(0,100-flags.reduce((v,f)=>v+f.points,0))};});
  res.json({year,month,provisional:true,warning:'Only observed punches are analyzed. Unreported leave, scheduled holidays, approved exceptions and missing attendance need HR review before any bonus decision.',people:summaries});
}));
router.get('/leave/my',auth(),asyncRoute(async(req,res)=>{
  const [[opening]]=await db.query('SELECT as_of,balance_days FROM hrx_leave_opening WHERE user_id=?',[req.user.id]);
  if(!opening)return res.json({configured:false,balance:null,message:'Opening balance is awaiting Admin entry'});
  const start=String(opening.as_of).slice(0,10),current=todayIST(),[sy,sm]=start.split('-').map(Number),[cy,cm]=current.split('-').map(Number);
  const accrualMonths=Math.max(0,(cy-sy)*12+(cm-sm)+1);
  const [[usage]]=await db.query("SELECT COALESCE(SUM(days),0) used FROM leave_requests WHERE user_id=? AND status='approved' AND from_date>=? AND from_date<=?",[req.user.id,start,current]);
  const approvedDays=Number(usage.used)||0;
  res.json({configured:true,asOf:start,opening:Number(opening.balance_days),accrualMonths,accrualDays:accrualMonths*1.5,approvedDays,balance:logic.earnedBalance({opening:Number(opening.balance_days),accrualMonths,approvedDays}),provisional:true,note:'Approved leave spanning the opening-date boundary requires Admin reconciliation.'});
}));
router.get('/admin/leave-register',auth(ADMIN),asyncRoute(async(req,res)=>{
  const [historical]=await db.query('SELECT * FROM hrx_historical_leave ORDER BY user_id,yr,mon');
  const [opening]=await db.query('SELECT * FROM hrx_leave_opening ORDER BY user_id');
  res.json({historical,opening});
}));
router.put('/admin/historical-leave',auth(ADMIN_WRITE),asyncRoute(async(req,res)=>{
  const {user_id,year=2026,month,eligible=true,total_days,paid_days,note=''}=req.body||{};
  if(!Number.isInteger(Number(user_id))||Number(user_id)<=0||Number(year)!==2026||!Number.isInteger(Number(month))||month<4||month>9)return bad(res,'Select a valid employee and April–September 2026 month');
  const total=eligible?Number(total_days):null,paid=eligible?(paid_days==null?logic.defaultHistoricalPaid(total):Number(paid_days)):null;
  if(eligible&&(!Number.isFinite(total)||total<0||total>31||!Number.isFinite(paid)||paid<0||paid>Math.min(total,1.5)))return bad(res,'Total leave or paid leave is invalid (paid maximum: 1.5 days)');
  const [[employee]]=await db.query('SELECT id FROM users WHERE id=?',[user_id]);if(!employee)return bad(res,'Employee not found');
  const lop=eligible?Math.max(0,total-paid):null,conn=await db.getConnection();
  try{await conn.beginTransaction();await conn.query(`INSERT INTO hrx_historical_leave(user_id,yr,mon,eligible,total_days,paid_days,lop_days,note,updated_by) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE eligible=VALUES(eligible),total_days=VALUES(total_days),paid_days=VALUES(paid_days),lop_days=VALUES(lop_days),note=VALUES(note),updated_by=VALUES(updated_by)`,[user_id,2026,month,eligible?1:0,total,paid,lop,String(note).slice(0,300),req.user.id]);await audit(conn,req.user.id,user_id,'historical_leave',`2026-${month}`,{eligible,total,paid,lop});await conn.commit();res.json({message:'Historical leave saved',user_id,year,month,eligible,total,paid,lop});}
  catch(e){await conn.rollback();throw e;}finally{conn.release();}
}));
router.put('/admin/opening-leave',auth(ADMIN_WRITE),asyncRoute(async(req,res)=>{
  const {user_id,balance_days,note=''}=req.body||{},balance=Number(balance_days);
  if(!Number.isInteger(Number(user_id))||user_id<=0||!Number.isFinite(balance)||balance<0||balance>100)return bad(res,'Enter a valid employee and opening balance');
  const conn=await db.getConnection();try{await conn.beginTransaction();await conn.query(`INSERT INTO hrx_leave_opening(user_id,as_of,balance_days,note,updated_by) VALUES (?,'2026-10-01',?,?,?) ON DUPLICATE KEY UPDATE as_of=VALUES(as_of),balance_days=VALUES(balance_days),note=VALUES(note),updated_by=VALUES(updated_by)`,[user_id,balance,String(note).slice(0,300),req.user.id]);await audit(conn,req.user.id,user_id,'opening_leave','2026-10-01',{balance});await conn.commit();res.json({message:'Opening balance saved',balance});}catch(e){await conn.rollback();throw e;}finally{conn.release();}
}));
router.get('/admin/salaries',auth(ADMIN),asyncRoute(async(req,res)=>{const [rows]=await db.query('SELECT * FROM hrx_salary_revision ORDER BY user_id,effective_month');res.json(rows);}));
router.put('/admin/salary',auth(ADMIN_WRITE),asyncRoute(async(req,res)=>{
  const {user_id,effective_month,gross_monthly,note=''}=req.body||{},gross=Number(gross_monthly);
  if(!Number.isInteger(Number(user_id))||user_id<=0||!checkMonth(effective_month)||!Number.isFinite(gross)||gross<=0||gross>100000000)return bad(res,'Enter a valid employee, month and salary');
  const conn=await db.getConnection();try{await conn.beginTransaction();await conn.query(`INSERT INTO hrx_salary_revision(user_id,effective_month,gross_monthly,note,updated_by) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE gross_monthly=VALUES(gross_monthly),note=VALUES(note),updated_by=VALUES(updated_by)`,[user_id,effective_month,gross,String(note).slice(0,300),req.user.id]);await audit(conn,req.user.id,user_id,'salary_revision',effective_month,{gross});await conn.commit();res.json({message:'Salary revision saved',user_id,effective_month});}catch(e){await conn.rollback();throw e;}finally{conn.release();}
}));
router.get('/admin/payroll-preview',auth(ADMIN),asyncRoute(async(req,res)=>{
  const {year,month}=ymon(req),people=await staff(!(year===2026&&month>=4&&month<=9)),ym=`${year}-${String(month).padStart(2,'0')}-01`;
  const [rates]=await db.query('SELECT user_id,effective_month,gross_monthly FROM hrx_salary_revision WHERE effective_month<=? ORDER BY user_id,effective_month',[ym]);
  const [leaves]=await db.query('SELECT user_id,eligible,total_days,paid_days,lop_days FROM hrx_historical_leave WHERE yr=? AND mon=?',[year,month]);
  const rows=people.map(p=>{
    const eligibleRates=rates.filter(r=>Number(r.user_id)===Number(p.id)),rate=eligibleRates.at(-1),leave=leaves.find(l=>Number(l.user_id)===Number(p.id));
    const result={id:p.id,name:p.name,department:p.department,salary:rate?Number(rate.gross_monthly):null,leave:leave||null,calculation:null,status:''};
    if(!rate)result.status='Salary revision required';else if(year===2026&&month>=4&&month<=9&&(!leave||!leave.eligible))result.status=leave?'Not eligible for month':'Historical leave entry required';else if(year===2026&&month>=4&&month<=9){result.calculation=logic.historicalPay({salary:result.salary,totalLeave:Number(leave.total_days),paidLeave:Number(leave.paid_days),year,month});result.status='Draft — review only';}else result.status='Future payroll requires approved leave/attendance reconciliation';
    return result;
  });
  res.json({year,month,rows,preview:true,finalized:false,note:'No payroll is saved or marked as paid. Future payroll remains pending reconciliation.'});
}));
router.get('/my/profile',auth(),asyncRoute(async(req,res)=>{
  const [[p]]=await db.query(`SELECT u.id,u.name,u.email,u.phone,e.department,e.designation,e.date_of_joining,
    ed.personal_email,ed.date_of_birth,ed.emergency_contact_name,ed.emergency_contact_phone,
    ed.address,ed.city,ed.state,ed.pincode,ed.bank_name,ed.bank_account_number,ed.bank_ifsc,ed.bank_branch
    FROM users u LEFT JOIN employees e ON e.user_id=u.id LEFT JOIN employee_details ed ON ed.user_id=u.id WHERE u.id=?`,[req.user.id]);
  if(!p)return res.status(404).json({message:'Profile not found'});
  const fields=['name','phone','personal_email','date_of_birth','emergency_contact_name','emergency_contact_phone','address','city','state','pincode','bank_name','bank_account_number','bank_ifsc','bank_branch'];
  const percentage=Math.round(fields.filter(k=>p[k]!=null&&String(p[k]).trim()).length/fields.length*100);
  res.json({profile:p,completion:percentage});
}));
router.patch('/my/profile',auth(),asyncRoute(async(req,res)=>{
  const fields=['personal_email','date_of_birth','emergency_contact_name','emergency_contact_phone','address','city','state','pincode','bank_name','bank_account_number','bank_ifsc','bank_branch'];
  const provided=fields.filter(k=>Object.prototype.hasOwnProperty.call(req.body||{},k));
  if(!provided.length)return bad(res,'No editable profile fields supplied');
  const vals=provided.map(k=>{const v=String(req.body[k]??'').trim();if(v.length>255)throw new Error('Field too long');return v||null;});
  if(provided.includes('bank_ifsc')&&vals[provided.indexOf('bank_ifsc')]&& !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(vals[provided.indexOf('bank_ifsc')].toUpperCase()))return bad(res,'Enter a valid bank IFSC');
  const conn=await db.getConnection();try{await conn.beginTransaction();await conn.query(`INSERT INTO employee_details(user_id,${provided.join(',')}) VALUES (?,${provided.map(()=>'?').join(',')}) ON DUPLICATE KEY UPDATE ${provided.map(k=>`${k}=VALUES(${k})`).join(',')}`,[req.user.id,...vals]);await audit(conn,req.user.id,req.user.id,'profile_updated','self',{fields:provided});await conn.commit();res.json({message:'Profile saved; bank changes should be verified by Admin'});}catch(e){await conn.rollback();throw e;}finally{conn.release();}
}));
module.exports=router;