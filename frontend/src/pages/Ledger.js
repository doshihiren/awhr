import { useEffect, useState } from 'react';
import api from '../api';
import { C } from '../theme';
import { Spinner, Btn, Badge } from '../components/UI';

export default function Ledger() {
  const [parties,  setParties]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [ledger,   setLedger]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  useEffect(()=>{
    api.get('/fin/parties-summary').then(r=>{ setParties(r.data); setLoading(false); });
  },[]);

  const loadLedger = async(party) => {
    setSelected(party); setLedger(null);
    const { data } = await api.get(`/fin/ledger/${party.id}`);
    setLedger(data);
  };

  const exportCSV = () => {
    if (!ledger) return;
    const rows = [
      ['Date','Document','Type','Debit','Credit','Balance'],
      ...ledger.ledger.map(e=>[
        new Date(e.date).toLocaleDateString('en-IN'),
        e.doc_num||'—', e.type,
        e.debit||0, e.credit||0, e.balance||0
      ])
    ];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url;
    a.download = `ledger_${selected.name}.csv`; a.click();
  };

  const filtered = parties.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <Spinner />;

  return (
    <div className="fade-in">
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:800}}>Party Ledger 📒</h1>
        <div style={{color:C.muted,fontSize:13,marginTop:2}}>Full transaction history per client/vendor</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:18}}>
        {/* Party List */}
        <div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search party..." style={{marginBottom:12}} />
          <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:'70vh',overflowY:'auto'}}>
            {filtered.map(p=>(
              <div key={p.id} onClick={()=>loadLedger(p)} style={{
                background:selected?.id===p.id?`${C.accent}22`:C.card,
                border:`1px solid ${selected?.id===p.id?C.accent:C.border}`,
                borderRadius:12,padding:'12px 14px',cursor:'pointer',transition:'all 0.15s'
              }}>
                <div style={{fontWeight:600,fontSize:13}}>{p.name}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{p.state||'—'} · {p.invoice_count} invoices</div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                  <span style={{fontSize:11,color:C.green}}>Billed: ₹{(p.total_billed/1000).toFixed(1)}K</span>
                  {p.balance_due>0&&<span style={{fontSize:11,color:C.orange,fontWeight:700}}>Due: ₹{(p.balance_due/1000).toFixed(1)}K</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ledger Detail */}
        <div>
          {!selected && (
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:40,textAlign:'center',color:C.muted}}>
              Select a party to view ledger
            </div>
          )}
          {selected && !ledger && <Spinner />}
          {selected && ledger && (
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden'}}>
              {/* Header */}
              <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:16,fontWeight:800}}>{ledger.party?.name}</div>
                  <div style={{fontSize:12,color:C.muted}}>{ledger.party?.gstin||'No GSTIN'} · {ledger.party?.state}</div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <Btn onClick={exportCSV} color={C.green} outline small>⬇ CSV</Btn>
                </div>
              </div>

              {/* Summary */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:0,borderBottom:`1px solid ${C.border}`}}>
                {[
                  ['Total Billed',ledger.totalDebit,C.accent],
                  ['Total Paid',ledger.totalCredit,C.green],
                  ['Closing Balance',ledger.closingBalance,ledger.closingBalance>0?C.orange:C.green],
                ].map(([l,v,c])=>(
                  <div key={l} style={{padding:'14px 20px',borderRight:`1px solid ${C.border}`}}>
                    <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{l}</div>
                    <div style={{fontSize:18,fontWeight:800,color:c}}>₹{Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</div>
                  </div>
                ))}
              </div>

              {/* Ledger Entries */}
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:C.surface}}>
                      {['Date','Document','Type','Debit','Credit','Balance'].map(h=>(
                        <th key={h} style={{padding:'10px 16px',fontSize:11,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',textAlign:['Debit','Credit','Balance'].includes(h)?'right':'left',borderBottom:`1px solid ${C.border}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.ledger.map((e,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.border}22`}}>
                        <td style={{padding:'11px 16px',fontSize:12}}>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                        <td style={{padding:'11px 16px',fontSize:12,color:C.accent,fontWeight:600}}>{e.doc_num||'—'}</td>
                        <td style={{padding:'11px 16px'}}>
                          <span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,background:`${e.type==='invoice'?C.accent:C.green}22`,color:e.type==='invoice'?C.accent:C.green}}>{e.type}</span>
                        </td>
                        <td style={{padding:'11px 16px',fontSize:12,fontWeight:600,color:C.red,textAlign:'right'}}>{e.debit>0?`₹${Number(e.debit).toLocaleString()}`:'—'}</td>
                        <td style={{padding:'11px 16px',fontSize:12,fontWeight:600,color:C.green,textAlign:'right'}}>{e.credit>0?`₹${Number(e.credit).toLocaleString()}`:'—'}</td>
                        <td style={{padding:'11px 16px',fontSize:13,fontWeight:800,color:e.balance>0?C.orange:C.green,textAlign:'right'}}>₹{Number(e.balance||0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ledger.ledger.length===0&&<div style={{padding:24,textAlign:'center',color:C.muted,fontSize:13}}>No transactions yet</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}