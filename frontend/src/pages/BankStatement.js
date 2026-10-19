import { useEffect, useState } from 'react';
import api from '../api';
import { C } from '../theme';
import { Spinner, Btn, Badge, Modal, Field } from '../components/UI';

export default function BankStatement() {
  const [banks,   setBanks]   = useState([]);
  const [selBank, setSelBank] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addBank, setAddBank] = useState({account_name:'',bank_name:'',account_number:'',ifsc:'',account_type:'current',opening_balance:0});
  const [mapModal, setMapModal] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [csvPreview, setCsvPreview] = useState([]);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(()=>{
    api.get('/fin/banks').then(r=>{ setBanks(r.data); if(r.data.length) loadEntries(r.data[0]); setLoading(false); });
    api.get('/billing/invoices').then(r=>setInvoices(r.data));
    api.get('/accounts/expenses').then(r=>setExpenses(r.data));
  },[]);

  const loadEntries = async(bank) => {
    setSelBank(bank);
    const { data } = await api.get(`/fin/bank-statement/${bank.id}`);
    setEntries(data);
  };

  const saveBank = async() => {
    await api.post('/fin/banks', addBank);
    setShowAdd(false);
    const { data } = await api.get('/fin/banks');
    setBanks(data);
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h=>h.trim().replace(/"/g,'').toLowerCase());
    return lines.slice(1).map(line=>{
      const vals = line.split(',').map(v=>v.trim().replace(/"/g,''));
      const obj  = {};
      headers.forEach((h,i)=>obj[h]=vals[i]||'');
      // Normalize common column names
      return {
        date:        obj.date||obj['value date']||obj['txn date']||'',
        description: obj.description||obj.narration||obj.particulars||obj.remarks||'',
        reference:   obj.reference||obj['chq/ref number']||obj['ref no']||'',
        debit:       parseFloat(obj.debit||obj.withdrawal||obj['dr amount']||0)||0,
        credit:      parseFloat(obj.credit||obj.deposit||obj['cr amount']||0)||0,
        balance:     parseFloat(obj.balance||obj['closing balance']||0)||0,
      };
    }).filter(r=>r.date);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      setCsvPreview(parsed);
      setShowUpload(true);
    };
    reader.readAsText(file);
  };

  const uploadStatement = async() => {
    await api.post(`/fin/bank-statement/${selBank.id}`, { entries: csvPreview });
    setShowUpload(false); setCsvPreview([]);
    loadEntries(selBank);
  };

  const mapEntry = async(type, refId) => {
    await api.put(`/fin/bank-statement/map/${mapModal.id}`, { mapped_to: type, mapped_id: refId });
    setMapModal(null); loadEntries(selBank);
  };

  const unmapped = entries.filter(e=>!e.is_mapped);
  const totalIn  = entries.reduce((s,e)=>s+parseFloat(e.credit||0),0);
  const totalOut = entries.reduce((s,e)=>s+parseFloat(e.debit||0),0);

  if (loading) return <Spinner />;

  return (
    <div className="fade-in">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800}}>Bank Statements 🏦</h1>
          <div style={{color:C.muted,fontSize:13,marginTop:2}}>Upload & reconcile bank/credit card statements</div>
        </div>
        <Btn onClick={()=>setShowAdd(true)} outline small color={C.accent}>+ Add Bank Account</Btn>
      </div>

      {/* Bank Selector */}
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        {banks.map(b=>(
          <div key={b.id} onClick={()=>loadEntries(b)} style={{
            background:selBank?.id===b.id?`${C.accent}22`:C.card,
            border:`1px solid ${selBank?.id===b.id?C.accent:C.border}`,
            borderRadius:12,padding:'12px 18px',cursor:'pointer',transition:'all 0.15s',minWidth:180
          }}>
            <div style={{fontWeight:700,fontSize:13}}>{b.account_name}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{b.bank_name}</div>
            <div style={{fontSize:16,fontWeight:800,color:C.green,marginTop:6}}>₹{Number(b.current_balance).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {selBank && (
        <>
          {/* Actions */}
          <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:18,flexWrap:'wrap'}}>
            <label style={{padding:'8px 16px',borderRadius:8,border:`1px solid ${C.accent}`,color:C.accent,fontSize:12,fontWeight:700,cursor:'pointer',background:`${C.accent}15`}}>
              📁 Upload CSV Statement
              <input type="file" accept=".csv" onChange={handleFile} style={{display:'none'}} />
            </label>
            <div style={{fontSize:12,color:C.muted}}>{entries.length} entries · {unmapped.length} unmapped</div>
            <div style={{marginLeft:'auto',display:'flex',gap:12}}>
              <span style={{fontSize:12,color:C.green,fontWeight:700}}>↑ ₹{(totalIn/1000).toFixed(1)}K in</span>
              <span style={{fontSize:12,color:C.red,fontWeight:700}}>↓ ₹{(totalOut/1000).toFixed(1)}K out</span>
            </div>
          </div>

          {/* Entries Table */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:C.surface}}>
                  {['Date','Description','Ref','Credit','Debit','Balance','Status','Action'].map(h=>(
                    <th key={h} style={{padding:'10px 14px',fontSize:11,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',textAlign:'left',borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.slice(0,100).map((e,i)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${C.border}22`,background:e.is_mapped?`${C.green}05`:'transparent'}}>
                    <td style={{padding:'10px 14px',fontSize:12,whiteSpace:'nowrap'}}>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                    <td style={{padding:'10px 14px',fontSize:12,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={e.description}>{e.description}</td>
                    <td style={{padding:'10px 14px',fontSize:11,color:C.muted}}>{e.reference||'—'}</td>
                    <td style={{padding:'10px 14px',fontSize:12,fontWeight:600,color:C.green}}>{e.credit>0?`₹${Number(e.credit).toLocaleString()}`:'—'}</td>
                    <td style={{padding:'10px 14px',fontSize:12,fontWeight:600,color:C.red}}>{e.debit>0?`₹${Number(e.debit).toLocaleString()}`:'—'}</td>
                    <td style={{padding:'10px 14px',fontSize:12,fontWeight:700}}>₹{Number(e.balance).toLocaleString()}</td>
                    <td style={{padding:'10px 14px'}}>
                      {e.is_mapped
                        ? <Badge color={C.green}>{e.mapped_to}</Badge>
                        : <Badge color={C.muted}>unmapped</Badge>}
                    </td>
                    <td style={{padding:'10px 14px'}}>
                      {!e.is_mapped && (
                        <button onClick={()=>setMapModal(e)} style={{padding:'3px 10px',borderRadius:6,border:`1px solid ${C.accent}44`,background:`${C.accent}15`,color:C.accent,fontSize:11,fontWeight:700,cursor:'pointer'}}>Map</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length===0&&<div style={{padding:40,textAlign:'center',color:C.muted,fontSize:13}}>No entries yet — upload a CSV statement</div>}
          </div>
        </>
      )}

      {/* CSV Preview Upload Modal */}
      {showUpload && (
        <Modal title={`Preview — ${csvPreview.length} entries`} onClose={()=>{setShowUpload(false);setCsvPreview([]);}}>
          <div style={{maxHeight:300,overflowY:'auto',marginBottom:16}}>
            {csvPreview.slice(0,10).map((e,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 2fr 1fr 1fr',gap:8,padding:'8px 0',borderBottom:`1px solid ${C.border}22`,fontSize:12}}>
                <span style={{color:C.muted}}>{e.date}</span>
                <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.description}</span>
                <span style={{color:C.green,textAlign:'right'}}>{e.credit>0?`+₹${e.credit}`:''}</span>
                <span style={{color:C.red,textAlign:'right'}}>{e.debit>0?`-₹${e.debit}`:''}</span>
              </div>
            ))}
            {csvPreview.length>10&&<div style={{padding:'8px 0',color:C.muted,fontSize:12,textAlign:'center'}}>...and {csvPreview.length-10} more entries</div>}
          </div>
          <Btn onClick={uploadStatement} style={{width:'100%'}}>Import {csvPreview.length} Entries</Btn>
        </Modal>
      )}

      {/* Map Entry Modal */}
      {mapModal && (
        <Modal title="Map Transaction" onClose={()=>setMapModal(null)}>
          <div style={{background:C.surface,borderRadius:10,padding:'12px 14px',marginBottom:16,fontSize:13}}>
            <div style={{fontWeight:700}}>{mapModal.description}</div>
            <div style={{color:C.muted,fontSize:12,marginTop:4}}>
              {new Date(mapModal.date).toLocaleDateString('en-IN')} ·
              {mapModal.credit>0?<span style={{color:C.green}}> +₹{mapModal.credit}</span>:<span style={{color:C.red}}> -₹{mapModal.debit}</span>}
            </div>
          </div>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Map to Invoice Payment:</div>
          <div style={{maxHeight:200,overflowY:'auto',marginBottom:14}}>
            {invoices.filter(inv=>inv.status!=='paid'&&inv.status!=='cancelled').map(inv=>(
              <div key={inv.id} onClick={()=>mapEntry('invoice',inv.id)} style={{padding:'10px 14px',background:C.surface,borderRadius:8,marginBottom:6,cursor:'pointer',border:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:13,fontWeight:600}}>{inv.invoice_number} — {inv.party_name}</span>
                <span style={{color:C.orange,fontWeight:700}}>₹{Number(inv.balance_due).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Or map to Expense:</div>
          <div style={{maxHeight:150,overflowY:'auto'}}>
            {expenses.filter(e=>e.status==='approved').slice(0,10).map(e=>(
              <div key={e.id} onClick={()=>mapEntry('expense',e.id)} style={{padding:'10px 14px',background:C.surface,borderRadius:8,marginBottom:6,cursor:'pointer',border:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:13}}>{e.title}</span>
                <span style={{color:C.red,fontWeight:700}}>₹{Number(e.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <Btn onClick={()=>mapEntry('other',null)} color={C.muted} outline style={{width:'100%',marginTop:10}}>Mark as Other</Btn>
        </Modal>
      )}

      {/* Add Bank Modal */}
      {showAdd && (
        <Modal title="Add Bank Account" onClose={()=>setShowAdd(false)}>
          <Field label="Account Name"><input value={addBank.account_name} onChange={e=>setAddBank({...addBank,account_name:e.target.value})} placeholder="e.g. Awelion Current Account" /></Field>
          <Field label="Bank Name"><input value={addBank.bank_name} onChange={e=>setAddBank({...addBank,bank_name:e.target.value})} placeholder="HDFC, SBI, ICICI..." /></Field>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="Account Number"><input value={addBank.account_number} onChange={e=>setAddBank({...addBank,account_number:e.target.value})} /></Field>
            <Field label="IFSC Code"><input value={addBank.ifsc} onChange={e=>setAddBank({...addBank,ifsc:e.target.value})} /></Field>
            <Field label="Account Type">
              <select value={addBank.account_type} onChange={e=>setAddBank({...addBank,account_type:e.target.value})}>
                {['current','savings','cc','od'].map(t=><option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </Field>
            <Field label="Opening Balance"><input type="number" value={addBank.opening_balance} onChange={e=>setAddBank({...addBank,opening_balance:e.target.value})} /></Field>
          </div>
          <Btn onClick={saveBank} style={{width:'100%'}}>Add Account</Btn>
        </Modal>
      )}
    </div>
  );
}