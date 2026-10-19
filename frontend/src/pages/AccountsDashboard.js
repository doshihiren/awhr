import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { C } from '../theme';
import { StatCard, Badge, Spinner, Btn } from '../components/UI';
import useIsMobile from '../hooks/useIsMobile';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? (value/max)*100 : 0;
  return (
    <div style={{height:6,borderRadius:3,background:C.border,overflow:'hidden',marginTop:4}}>
      <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:3,transition:'width 0.5s'}} />
    </div>
  );
}

export default function AccountsDashboard() {
  const isMobile = useIsMobile();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [data,  setData]  = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async() => {
    setLoading(true);
    try {
      const { data: d } = await api.get(`/fin/dashboard?month=${month}&year=${year}`);
      setData(d);
    } catch(e) {}
    setLoading(false);
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (!data)   return <div style={{color:C.muted,padding:40,textAlign:'center'}}>Could not load dashboard</div>;

  const maxTrend = Math.max(...(data.trend||[]).map(t=>parseFloat(t.revenue||0)),1);
  const maxExp   = Math.max(...(data.expBreakdown||[]).map(e=>parseFloat(e.total||0)),1);

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800}}>Accounts Dashboard 📊</h1>
          <div style={{color:C.muted,fontSize:13,marginTop:2}}>Business Intelligence & Financial Overview</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select value={month} onChange={e=>setMonth(parseInt(e.target.value))} style={{padding:'7px 12px',borderRadius:8,width:'auto'}}>
            {months.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e=>setYear(parseInt(e.target.value))} style={{padding:'7px 12px',borderRadius:8,width:'auto'}}>
            {[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Row 1 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:18}}>
        <StatCard label="Revenue Billed" value={`₹${(data.revenue/100000).toFixed(2)}L`} icon="📈" color={C.accent} sub={`${months[month-1]} ${year}`} />
        <StatCard label="Collected" value={`₹${(data.collected/100000).toFixed(2)}L`} icon="✅" color={C.green} sub="Cash received" />
        <StatCard label="Outstanding" value={`₹${(data.outstanding/100000).toFixed(2)}L`} icon="⏳" color={C.orange} sub="To be collected" />
        <StatCard label="Net Profit" value={`₹${(data.profit/100000).toFixed(2)}L`} icon={data.profit>=0?'📊':'📉'} color={data.profit>=0?C.green:C.red} sub={`${data.profit_margin}% margin`} />
      </div>

      {/* KPI Row 2 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:20}}>
        <StatCard label="Total Expenses" value={`₹${(data.expenses/100000).toFixed(2)}L`} icon="📤" color={C.red} sub="Incl. payroll" />
        <StatCard label="GST Collected" value={`₹${(data.gst_collected/1000).toFixed(1)}K`} icon="🏛️" color={C.yellow} sub="CGST+SGST+IGST" />
        <StatCard label="Pipeline Value" value={`₹${(data.pipeline/100000).toFixed(2)}L`} icon="🎯" color="#FF6B9D" sub="Open leads" />
        <StatCard label="Active Projects" value={data.activeProjects} icon="🚀" color={C.accent} sub={`${data.teamSize} team members`} />
      </div>

      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr',gap:18,marginBottom:18}}>
        {/* Revenue Trend Chart */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'20px 22px'}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:18}}>Revenue Trend — Last 6 Months</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:10,height:140}}>
            {(data.trend||[]).map((t,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{fontSize:10,color:C.green,fontWeight:700}}>₹{(parseFloat(t.revenue)/1000).toFixed(0)}K</div>
                <div style={{
                  width:'100%',
                  height:`${(parseFloat(t.revenue)/maxTrend)*120}px`,
                  background:`linear-gradient(180deg,${C.accent},${C.accent}88)`,
                  borderRadius:'6px 6px 0 0',
                  minHeight:4,
                  boxShadow:`0 0 12px ${C.accent}44`,
                  transition:'height 0.5s',
                }} />
                <div style={{fontSize:10,color:C.muted}}>{t.month?.split(' ')[0]}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:4,marginTop:10,flexWrap:'wrap'}}>
            <span style={{fontSize:11,color:C.accent,fontWeight:600}}>■ Revenue</span>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'20px 22px'}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>Expense Breakdown</div>
          {(data.expBreakdown||[]).map((e,i)=>(
            <div key={i} style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                <span style={{color:C.muted,textTransform:'capitalize'}}>{e.category}</span>
                <span style={{fontWeight:700,color:C.orange}}>₹{Number(e.total).toLocaleString()}</span>
              </div>
              <MiniBar value={parseFloat(e.total)} max={maxExp} color={C.orange} />
            </div>
          ))}
          {(!data.expBreakdown||data.expBreakdown.length===0) && (
            <div style={{color:C.muted,fontSize:12,textAlign:'center',padding:'20px 0'}}>No expenses this month</div>
          )}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',gap:18,marginBottom:18}}>
        {/* Top Clients */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`,fontSize:15,fontWeight:700}}>Top Clients</div>
          {(data.topClients||[]).map((c,i)=>(
            <div key={i} style={{padding:'13px 20px',borderBottom:`1px solid ${C.border}22`,display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:`linear-gradient(135deg,${C.accent},${C.green})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0}}>
                {c.name?.slice(0,1)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{c.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{c.invoice_count} invoices</div>
                <MiniBar value={parseFloat(c.total_paid)} max={parseFloat(c.total_billed)} color={C.green} />
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:700,fontSize:13,color:C.green}}>₹{(c.total_billed/1000).toFixed(0)}K</div>
                {c.balance_due>0&&<div style={{fontSize:11,color:C.orange}}>Due: ₹{(c.balance_due/1000).toFixed(0)}K</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Overdue Invoices */}
        <div style={{background:C.card,border:`1px solid ${C.red}33`,borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`,fontSize:15,fontWeight:700,color:C.red}}>
            ⚠️ Overdue Invoices ({data.overdue?.length||0})
          </div>
          {data.overdue?.length===0&&<div style={{padding:24,color:C.muted,textAlign:'center',fontSize:13}}>No overdue invoices 🎉</div>}
          {(data.overdue||[]).map((inv,i)=>(
            <div key={i} style={{padding:'12px 20px',borderBottom:`1px solid ${C.border}22`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:600,fontSize:13,color:C.accent}}>{inv.invoice_number}</div>
                <div style={{fontSize:11,color:C.muted}}>{inv.party_name}</div>
                <div style={{fontSize:11,color:C.red}}>Due: {new Date(inv.due_date).toLocaleDateString('en-IN')}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:700,color:C.red}}>₹{Number(inv.balance_due).toLocaleString()}</div>
                <span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,background:`${C.orange}22`,color:C.orange}}>{inv.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bank Balances + Recent Transactions */}
      <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : '1fr 1.5fr',gap:18}}>
        {/* Banks */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`,fontSize:15,fontWeight:700}}>Bank Balances 🏦</div>
          {(data.banks||[]).map((b,i)=>(
            <div key={i} style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}22`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{b.account_name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{b.bank_name} · {b.account_type}</div>
                </div>
                <div style={{fontWeight:800,fontSize:15,color:C.green}}>₹{Number(b.current_balance).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Transactions */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`,fontSize:15,fontWeight:700}}>Recent Transactions</div>
          {(data.recentTxns||[]).map((t,i)=>(
            <div key={i} style={{padding:'11px 20px',borderBottom:`1px solid ${C.border}22`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:600,fontSize:12}}>{t.title}</div>
                <div style={{fontSize:11,color:C.muted}}>{new Date(t.date).toLocaleDateString('en-IN')} · {t.payment_mode?.replace('_',' ')}</div>
              </div>
              <div style={{fontWeight:700,color:t.type==='income'?C.green:C.red,fontSize:13}}>
                {t.type==='income'?'+':'−'}₹{Number(t.amount).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}