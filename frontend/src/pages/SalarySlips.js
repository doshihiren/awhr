import { useEffect, useState } from 'react';
import api from '../api';
import { C } from '../theme';
import { Spinner, Btn, Badge } from '../components/UI';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function SlipView({ slip, company, onClose }) {
  const s = slip;
  if (!s) return null;
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'#fff',color:'#000',borderRadius:16,padding:32,width:'100%',maxWidth:680,maxHeight:'90vh',overflowY:'auto'}} className="fade-in">
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:'#1a1a2e'}}>{company?.company_name||'Awelion'}</div>
            {company?.address&&<div style={{fontSize:12,color:'#666',marginTop:2}}>{company.address}, {company.city}, {company.state}</div>}
            {company?.gstin&&<div style={{fontSize:12,color:'#666'}}>GSTIN: {company.gstin}</div>}
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:16,fontWeight:800,color:'#0f766e'}}>SALARY SLIP</div>
            <div style={{fontSize:13,color:'#666',marginTop:2}}>{months[s.month-1]} {s.year}</div>
          </div>
        </div>

        <div style={{background:'#f8f9ff',borderRadius:10,padding:'14px 16px',marginBottom:18,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[['Employee',s.name],['Designation',s.designation],['Department',s.department],['Bank Account',s.bank_account_number||'—'],['PAN',s.pan_number||'—'],['Working Days',s.working_days],['Present Days',s.present_days],['LOP Days',s.lop_days||0]].map(([l,v])=>(
            <div key={l}>
              <div style={{fontSize:10,color:'#999',textTransform:'uppercase',letterSpacing:'0.5px'}}>{l}</div>
              <div style={{fontSize:13,fontWeight:600,color:'#1a1a2e'}}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:18}}>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:'#1a1a2e',marginBottom:10,padding:'8px 12px',background:'#e8f5e9',borderRadius:6}}>EARNINGS</div>
            {[['Basic Salary',s.basic],['HRA',s.hra],['Other Allowance',s.other_allowance]].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee',fontSize:13}}>
                <span style={{color:'#555'}}>{l}</span>
                <span style={{fontWeight:600}}>₹{Number(v||0).toLocaleString()}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',fontSize:14,fontWeight:800}}>
              <span>Gross Salary</span>
              <span style={{color:'#2e7d32'}}>₹{Number(s.gross_salary||0).toLocaleString()}</span>
            </div>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:'#1a1a2e',marginBottom:10,padding:'8px 12px',background:'#ffeef0',borderRadius:6}}>DEDUCTIONS</div>
            {[['Professional Tax',s.pt_deduction||0],['LOP Deduction',s.lop_deduction||0],['TDS',s.tds_deduction||0],['Other',s.other_deduction||0]].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #eee',fontSize:13}}>
                <span style={{color:'#555'}}>{l}</span>
                <span style={{fontWeight:600}}>₹{Number(v||0).toLocaleString()}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',fontSize:14,fontWeight:800}}>
              <span>Total Deductions</span>
              <span style={{color:'#c62828'}}>₹{Number(s.total_deduction||0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div style={{background:'linear-gradient(135deg,#0f766e,#0ea5a4)',borderRadius:10,padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div style={{color:'#fff',fontSize:16,fontWeight:800}}>NET SALARY</div>
          <div style={{color:'#fff',fontSize:24,fontWeight:800}}>₹{Number(s.net_salary||0).toLocaleString()}</div>
        </div>

        {company?.bank_name&&(
          <div style={{fontSize:12,color:'#666',borderTop:'1px solid #eee',paddingTop:12}}>
            <strong>Company Bank:</strong> {company.bank_name} · A/C: {company.bank_account} · IFSC: {company.bank_ifsc}
          </div>
        )}

        <div style={{display:'flex',gap:10,marginTop:16}}>
          <button onClick={()=>window.print()} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #0f766e',background:'#0f766e',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>🖨️ Print</button>
          <button onClick={onClose} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #ddd',background:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function SalarySlips() {
  const now = new Date();
  const [month,   setMonth]   = useState(now.getMonth()+1);
  const [year,    setYear]    = useState(now.getFullYear());
  const [slips,   setSlips]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [company, setCompany] = useState(null);
  const [generating, setGenerating] = useState(false);

  const load = async() => {
    setLoading(true);
    const [s, c] = await Promise.all([
      api.get(`/fin/salary-slips?month=${month}&year=${year}`),
      api.get('/billing/settings'),
    ]);
    setSlips(s.data); setCompany(c.data); setLoading(false);
  };
  useEffect(()=>{ load(); },[month,year]);

  const generate = async() => {
    setGenerating(true);
    await api.post('/fin/salary-slips/generate', { month, year });
    setGenerating(false); load();
  };

  const viewSlip = async(emp) => {
    const { data } = await api.get(`/fin/salary-slips/${emp.user_id}/${month}/${year}`);
    setViewing(data);
  };

  if (loading) return <Spinner />;

  return (
    <div className="fade-in">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800}}>Salary Slips 💳</h1>
          <div style={{color:C.muted,fontSize:13,marginTop:2}}>Generate and view monthly salary slips</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <select value={month} onChange={e=>setMonth(parseInt(e.target.value))} style={{padding:'7px 12px',borderRadius:8,width:'auto'}}>
            {months.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e=>setYear(parseInt(e.target.value))} style={{padding:'7px 12px',borderRadius:8,width:'auto'}}>
            {[2024,2025,2026].map(y=><option key={y}>{y}</option>)}
          </select>
          <Btn onClick={generate} color={C.green} small>{generating?'Generating...':'⚡ Generate All'}</Btn>
        </div>
      </div>

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 80px 80px',padding:'12px 20px',borderBottom:`1px solid ${C.border}`,fontSize:11,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px'}}>
          <span>Employee</span><span>Gross</span><span>Deductions</span><span>Net</span><span>Status</span><span>PT</span><span>Action</span>
        </div>
        {slips.length===0&&<div style={{padding:40,textAlign:'center',color:C.muted,fontSize:13}}>No salary slips for {months[month-1]} {year} — click Generate All</div>}
        {slips.map((s,i)=>(
          <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 80px 80px',padding:'14px 20px',borderBottom:`1px solid ${C.border}22`,alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:`linear-gradient(135deg,${C.accent},${C.green})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',flexShrink:0}}>
                {s.avatar||s.name?.slice(0,2)}
              </div>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{s.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{s.designation}</div>
              </div>
            </div>
            <div style={{fontWeight:600,fontSize:13}}>₹{Number(s.gross_salary||0).toLocaleString()}</div>
            <div style={{fontSize:13,color:C.red}}>₹{Number(s.total_deduction||0).toLocaleString()}</div>
            <div style={{fontWeight:800,color:C.green,fontSize:14}}>₹{Number(s.net_salary||0).toLocaleString()}</div>
            <Badge color={s.status==='generated'?C.green:s.status==='sent'?C.accent:C.muted}>{s.status}</Badge>
            <div style={{fontSize:12,color:s.pt_deduction>0?C.orange:C.muted}}>₹{s.pt_deduction||0}</div>
            <Btn onClick={()=>viewSlip(s)} color={C.accent} outline small>View</Btn>
          </div>
        ))}
      </div>

      {viewing && <SlipView slip={viewing.slip} company={viewing.company} onClose={()=>setViewing(null)} />}
    </div>
  );
}