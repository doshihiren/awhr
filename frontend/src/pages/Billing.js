import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { C } from '../theme';
import { Btn, Modal, Field, Spinner, Badge, StatCard, TableCard, Row } from '../components/UI';

const statusColor = { draft:C.muted, sent:C.accent, accepted:C.green, rejected:C.red, converted:C.yellow, paid:C.green, partial:C.orange, overdue:C.red, cancelled:C.red };
const gstTypeColor = { cgst_sgst:C.green, igst:C.accent };

// ─── ITEM ROW COMPONENT ──────────────────────────────────────────────────────
function ItemRow({ item, onChange, onRemove, hsnCodes }) {
  const amount = (item.quantity * item.unit_price) * (1 - (item.discount_percent||0)/100);
  return (
    <div style={{display:'grid',gridTemplateColumns:'2.5fr 1fr 1fr 0.8fr 0.8fr 0.8fr 30px',gap:6,marginBottom:8,alignItems:'center'}}>
      <div>
        <input value={item.description} onChange={e=>onChange('description',e.target.value)} placeholder="Description of service/product" style={{marginBottom:4}} />
        <select value={item.hsn_sac_code||''} onChange={e=>{
          const h = hsnCodes.find(x=>x.code===e.target.value);
          onChange('hsn_sac_code',e.target.value);
          if(h) onChange('gst_rate',h.gst_rate);
        }} style={{fontSize:11,padding:'4px 8px'}}>
          <option value="">HSN/SAC</option>
          {hsnCodes.map(h=><option key={h.id} value={h.code}>{h.code} — {h.description.slice(0,30)}</option>)}
        </select>
      </div>
      <input type="number" value={item.quantity} onChange={e=>onChange('quantity',e.target.value)} placeholder="Qty" style={{textAlign:'center'}} />
      <input type="number" value={item.unit_price} onChange={e=>onChange('unit_price',e.target.value)} placeholder="Rate ₹" />
      <input type="number" value={item.discount_percent||''} onChange={e=>onChange('discount_percent',e.target.value)} placeholder="Disc%" style={{textAlign:'center'}} />
      <input type="number" value={item.gst_rate||18} onChange={e=>onChange('gst_rate',e.target.value)} placeholder="GST%" style={{textAlign:'center'}} />
      <div style={{fontSize:12,fontWeight:700,color:C.green,textAlign:'right'}}>₹{amount.toLocaleString('en-IN',{maximumFractionDigits:2})}</div>
      <button onClick={onRemove} style={{background:`${C.red}22`,border:'none',color:C.red,borderRadius:6,cursor:'pointer',fontSize:14,padding:'4px'}}>✕</button>
    </div>
  );
}

// ─── DOCUMENT FORM ───────────────────────────────────────────────────────────
function DocumentForm({ type, onClose, onSave, prefill = null }) {
  const [parties, setParties]   = useState([]);
  const [projects, setProjects] = useState([]);
  const [hsnCodes, setHsn]      = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm] = useState({
    party_id:'', project_id:'', issue_date:new Date().toISOString().split('T')[0],
    due_date:'', valid_until:'', notes:'', terms:'Net 30 days',
    tds_percent:0, is_recurring:0, recurring_interval:'monthly', next_renewal_date:'',
    items:[{description:'',hsn_sac_code:'',quantity:1,unit_price:'',discount_percent:0,gst_rate:18,unit:'nos'}]
  });
  const [calc, setCalc]         = useState({subtotal:0,discount:0,taxable:0,cgst:0,sgst:0,igst:0,tds:0,total:0,gst_type:'cgst_sgst'});
  const [party, setParty]       = useState(null);
  const [compState]             = useState('Gujarat');

  useEffect(()=>{
    Promise.all([api.get('/billing/parties'),api.get('/projects'),api.get('/billing/hsn')]).then(([p,pr,h])=>{
      setParties(p.data); setProjects(pr.data); setHsn(h.data); setLoading(false);
    });
    if (prefill) setForm(f=>({...f,...prefill}));
  },[]);

  useEffect(()=>{
    if (!form.party_id) return;
    const p = parties.find(x=>x.id===parseInt(form.party_id));
    setParty(p);
  },[form.party_id, parties]);

  useEffect(()=>{
    const gst_type = party?.state === compState ? 'cgst_sgst' : 'igst';
    let sub=0,disc=0,cgst=0,sgst=0,igst=0;
    form.items.forEach(it=>{
      const base = (parseFloat(it.quantity)||0)*(parseFloat(it.unit_price)||0);
      const d    = base*(parseFloat(it.discount_percent)||0)/100;
      const tax  = base-d;
      sub+=base; disc+=d;
      if(gst_type==='cgst_sgst'){cgst+=tax*(parseFloat(it.gst_rate)||18)/2/100;sgst+=tax*(parseFloat(it.gst_rate)||18)/2/100;}
      else igst+=tax*(parseFloat(it.gst_rate)||18)/100;
    });
    const taxable = sub-disc;
    const tds = taxable*(parseFloat(form.tds_percent)||0)/100;
    setCalc({subtotal:sub,discount:disc,taxable,cgst,sgst,igst,tds,total:taxable+cgst+sgst+igst-tds,gst_type});
  },[form.items,party,form.tds_percent]);

  const updateItem = (i,field,val)=>{
    const items=[...form.items]; items[i]={...items[i],[field]:val}; setForm({...form,items});
  };
  const addItem = ()=>setForm({...form,items:[...form.items,{description:'',hsn_sac_code:'',quantity:1,unit_price:'',discount_percent:0,gst_rate:18,unit:'nos'}]});
  const removeItem = i=>setForm({...form,items:form.items.filter((_,idx)=>idx!==i)});

  const submit = async()=>{
    try{
      await onSave({...form,items:form.items.map(it=>({...it,quantity:parseFloat(it.quantity),unit_price:parseFloat(it.unit_price),gst_rate:parseFloat(it.gst_rate)||18}))});
      onClose();
    }catch(err){alert(err.response?.data?.message||'Error creating document');}
  };

  const typeLabel = {quotation:'Quotation',proforma:'Proforma Invoice',invoice:'Invoice'};

  if(loading) return <div style={{padding:40,textAlign:'center',color:C.muted}}>Loading...</div>;

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:28,maxHeight:'90vh',overflowY:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:22}}>
        <div style={{fontSize:17,fontWeight:800}}>New {typeLabel[type]}</div>
        <button onClick={onClose} style={{background:'none',border:'none',color:C.muted,fontSize:20,cursor:'pointer'}}>✕</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
        <Field label="Party / Client">
          <select value={form.party_id} onChange={e=>setForm({...form,party_id:e.target.value})}>
            <option value="">Select party</option>
            {parties.map(p=><option key={p.id} value={p.id}>{p.name} ({p.state||'—'})</option>)}
          </select>
        </Field>
        <Field label="Project (optional)">
          <select value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}>
            <option value="">No project</option>
            {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Issue Date"><input type="date" value={form.issue_date} onChange={e=>setForm({...form,issue_date:e.target.value})} /></Field>
        {type==='quotation'&&<Field label="Valid Until"><input type="date" value={form.valid_until} onChange={e=>setForm({...form,valid_until:e.target.value})} /></Field>}
        {type!=='quotation'&&<Field label="Due Date"><input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} /></Field>}
        <Field label="TDS %"><input type="number" value={form.tds_percent} onChange={e=>setForm({...form,tds_percent:e.target.value})} placeholder="0" step="0.5" /></Field>
      </div>

      {/* GST Type indicator */}
      {party && (
        <div style={{background:`${calc.gst_type==='cgst_sgst'?C.green:C.accent}15`,border:`1px solid ${calc.gst_type==='cgst_sgst'?C.green:C.accent}44`,borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:13}}>
          {calc.gst_type==='cgst_sgst'
            ? `✅ Gujarat Client — CGST + SGST applicable (${party.state})`
            : `📦 Out of Gujarat — IGST applicable (${party.state})`}
        </div>
      )}

      {/* Recurring (only for PI) */}
      {type==='proforma' && (
        <div style={{background:C.surface,borderRadius:10,padding:'12px 14px',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:form.is_recurring?12:0}}>
            <input type="checkbox" checked={!!form.is_recurring} onChange={e=>setForm({...form,is_recurring:e.target.checked?1:0})} id="recurring" />
            <label htmlFor="recurring" style={{fontSize:13,fontWeight:600,cursor:'pointer'}}>🔄 Recurring Bill</label>
          </div>
          {!!form.is_recurring && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Field label="Interval">
                <select value={form.recurring_interval} onChange={e=>setForm({...form,recurring_interval:e.target.value})}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_yearly">Half Yearly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </Field>
              <Field label="Next Renewal Date"><input type="date" value={form.next_renewal_date} onChange={e=>setForm({...form,next_renewal_date:e.target.value})} /></Field>
            </div>
          )}
        </div>
      )}

      {/* Line Items */}
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
          <div style={{fontSize:13,fontWeight:700}}>Line Items</div>
          <button onClick={addItem} style={{fontSize:12,color:C.accent,background:'none',border:'none',cursor:'pointer',fontWeight:700}}>+ Add Item</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'2.5fr 1fr 1fr 0.8fr 0.8fr 0.8fr 30px',gap:6,marginBottom:6}}>
          {['Description / HSN','Qty','Rate ₹','Disc%','GST%','Amount',''].map((h,i)=>(
            <div key={i} style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px'}}>{h}</div>
          ))}
        </div>
        {form.items.map((it,i)=>(
          <ItemRow key={i} item={it} hsnCodes={hsnCodes} onChange={(f,v)=>updateItem(i,f,v)} onRemove={()=>removeItem(i)} />
        ))}
      </div>

      {/* Tax Summary */}
      <div style={{background:C.surface,borderRadius:12,padding:'16px',marginBottom:16}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[
            ['Subtotal',calc.subtotal],['Discount',calc.discount],['Taxable Amount',calc.taxable],
            ...(calc.gst_type==='cgst_sgst'?[['CGST',calc.cgst],['SGST',calc.sgst]]:[['IGST',calc.igst]]),
            ...(parseFloat(form.tds_percent)?[['TDS Deduction',`(${calc.tds.toFixed(2)})`]]:[]),
          ].map(([l,v],i)=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${C.border}22`,fontSize:12}}>
              <span style={{color:C.muted}}>{l}</span>
              <span style={{fontWeight:600}}>₹{typeof v==='string'?v:v.toFixed(2)}</span>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderTop:`2px solid ${C.border}`,fontSize:15,fontWeight:800,gridColumn:'1/-1'}}>
            <span>Total</span>
            <span style={{color:C.green}}>₹{calc.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <Field label="Notes"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder="Payment terms, special notes..." /></Field>

      <div style={{display:'flex',gap:10,marginTop:16}}>
        <Btn onClick={submit} style={{flex:1}}>Create {typeLabel[type]}</Btn>
        <Btn onClick={onClose} color={C.muted} outline style={{flex:1}}>Cancel</Btn>
      </div>
    </div>
  );
}

// ─── MAIN BILLING PAGE ───────────────────────────────────────────────────────
export default function Billing() {
  const [tab, setTab]         = useState('invoices');
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [detail, setDetail]   = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm]   = useState({amount:'',payment_date:new Date().toISOString().split('T')[0],payment_mode:'bank_transfer',reference_number:''});
  const [gst, setGst]           = useState(null);
  const [recurring, setRecurring] = useState([]);

  const tabs = [
    {key:'invoices',label:'🧾 Invoices'},
    {key:'proforma',label:'📄 Proforma'},
    {key:'quotations',label:'💬 Quotations'},
    {key:'gst',label:'📊 GST Filing'},
    {key:'recurring',label:'🔄 Recurring'},
  ];

  const load = useCallback(async()=>{
    setLoading(true);
    try{
      if(tab==='invoices'){const{data:d}=await api.get('/billing/invoices');setData(d);}
      else if(tab==='proforma'){const{data:d}=await api.get('/billing/proforma');setData(d);}
      else if(tab==='quotations'){const{data:d}=await api.get('/billing/quotations');setData(d);}
      else if(tab==='gst'){const{data:d}=await api.get('/billing/gst-summary');setGst(d);}
      else if(tab==='recurring'){const{data:d}=await api.get('/billing/recurring-due');setRecurring(d);}
    }catch(e){}
    setLoading(false);
  },[tab]);

  useEffect(()=>{load();},[load]);

  const loadDetail = async(id)=>{
    const ep = tab==='invoices'?`/billing/invoices/${id}`:tab==='proforma'?`/billing/proforma/${id}`:`/billing/quotations/${id}`;
    const{data:d}=await api.get(ep); setDetail(d);
  };

  const convertToPI = async(id)=>{
    await api.post(`/billing/quotations/${id}/convert-to-pi`);
    alert('Converted to Proforma Invoice!'); load();
  };
  const convertToInvoice = async(id)=>{
    const{data:d}=await api.post(`/billing/proforma/${id}/convert-to-invoice`);
    alert(`Invoice ${d.invoice_number} created!`); setTab('invoices'); load();
  };
  const recordPayment = async()=>{
    await api.post(`/billing/invoices/${detail.id}/payment`,payForm);
    setPayModal(false); loadDetail(detail.id); load();
  };

  const save = async(formData)=>{
    if(tab==='invoices') await api.post('/billing/invoices',formData);
    else if(tab==='proforma') await api.post('/billing/proforma',formData);
    else if(tab==='quotations') await api.post('/billing/quotations',formData);
    setModal(null); load();
  };

  const totalValue = data.reduce((s,d)=>s+parseFloat(d.total||0),0);
  const paidValue  = data.filter(d=>d.status==='paid').reduce((s,d)=>s+parseFloat(d.total||0),0);

  return (
    <div className="fade-in">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800}}>Billing & GST 🧾</h1>
          <div style={{color:C.muted,fontSize:13,marginTop:2}}>Quotation → Proforma → Invoice</div>
        </div>
        {['invoices','proforma','quotations'].includes(tab) && (
          <Btn onClick={()=>setModal(true)} small>+ New {tab==='invoices'?'Invoice':tab==='proforma'?'Proforma':'Quotation'}</Btn>
        )}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:C.card,padding:'5px 6px',borderRadius:12,border:`1px solid ${C.border}`,marginBottom:20,overflowX:'auto'}}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>{setTab(t.key);setDetail(null);}} style={{padding:'7px 14px',borderRadius:8,border:'none',background:tab===t.key?C.accent:'transparent',color:tab===t.key?'#fff':C.muted,fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* INVOICES */}
          {tab==='invoices' && (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:18}}>
                <StatCard label="Total Invoiced" value={`₹${(totalValue/1000).toFixed(1)}K`} icon="🧾" color={C.accent} />
                <StatCard label="Collected" value={`₹${(paidValue/1000).toFixed(1)}K`} icon="✅" color={C.green} />
                <StatCard label="Pending" value={`₹${((totalValue-paidValue)/1000).toFixed(1)}K`} icon="⏳" color={C.orange} />
              </div>
              <TableCard title={`${data.length} Invoices`}>
                {data.map((inv,i)=>(
                  <Row key={i} i={i} style={{cursor:'pointer'}} onClick={()=>loadDetail(inv.id)}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,color:C.accent,fontSize:13}}>{inv.invoice_number}</div>
                      <div style={{fontSize:11,color:C.muted}}>{inv.party_name} · {new Date(inv.issue_date).toLocaleDateString('en-IN')}</div>
                    </div>
                    <Badge color={gstTypeColor[inv.gst_type]}>{inv.gst_type==='cgst_sgst'?'CGST/SGST':'IGST'}</Badge>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontWeight:800,color:C.green}}>₹{Number(inv.total).toLocaleString()}</div>
                      {inv.balance_due>0&&<div style={{fontSize:11,color:C.orange}}>Due: ₹{Number(inv.balance_due).toLocaleString()}</div>}
                    </div>
                    <Badge color={statusColor[inv.status]}>{inv.status}</Badge>
                  </Row>
                ))}
              </TableCard>
            </>
          )}

          {/* PROFORMA */}
          {tab==='proforma' && (
            <TableCard title={`${data.length} Proforma Invoices`}>
              {data.map((pi,i)=>(
                <Row key={i} i={i}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:C.accent,fontSize:13}}>{pi.pi_number}</div>
                    <div style={{fontSize:11,color:C.muted}}>{pi.party_name} · {new Date(pi.issue_date).toLocaleDateString('en-IN')}</div>
                    {pi.is_recurring&&<span style={{fontSize:10,color:C.yellow,fontWeight:600}}>🔄 Recurring · Next: {pi.next_renewal_date?new Date(pi.next_renewal_date).toLocaleDateString('en-IN'):'—'}</span>}
                  </div>
                  <div style={{textAlign:'right',marginRight:8}}>
                    <div style={{fontWeight:800,color:C.green}}>₹{Number(pi.total).toLocaleString()}</div>
                  </div>
                  <Badge color={statusColor[pi.status]}>{pi.status}</Badge>
                  {pi.status!=='converted'&&pi.status!=='cancelled'&&(
                    <Btn onClick={()=>convertToInvoice(pi.id)} color={C.green} small>→ Invoice</Btn>
                  )}
                </Row>
              ))}
            </TableCard>
          )}

          {/* QUOTATIONS */}
          {tab==='quotations' && (
            <TableCard title={`${data.length} Quotations`}>
              {data.map((q,i)=>(
                <Row key={i} i={i}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:C.accent,fontSize:13}}>{q.quote_number}</div>
                    <div style={{fontSize:11,color:C.muted}}>{q.party_name} · Valid till: {q.valid_until?new Date(q.valid_until).toLocaleDateString('en-IN'):'—'}</div>
                  </div>
                  <div style={{fontWeight:800,color:C.green,marginRight:8}}>₹{Number(q.total).toLocaleString()}</div>
                  <Badge color={statusColor[q.status]}>{q.status}</Badge>
                  {q.status==='accepted'&&<Btn onClick={()=>convertToPI(q.id)} color={C.yellow} small>→ PI</Btn>}
                  {q.status==='draft'&&<Btn onClick={()=>api.put(`/billing/quotations/${q.id}`,{status:'sent'}).then(load)} color={C.accent} outline small>Send</Btn>}
                </Row>
              ))}
            </TableCard>
          )}

          {/* GST FILING */}
          {tab==='gst' && gst && (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:18}}>
                <StatCard label="Total Sales" value={`₹${(gst.total_sales/1000).toFixed(1)}K`} icon="📈" color={C.green} />
                <StatCard label="Total GST" value={`₹${(gst.total_gst/1000).toFixed(1)}K`} icon="🏛️" color={C.accent} />
                <StatCard label="IGST" value={`₹${(gst.total_igst/1000).toFixed(1)}K`} icon="📦" color={C.orange} />
              </div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:'20px 22px',marginBottom:18}}>
                <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>GST Summary</div>
                {[['Total Taxable',gst.total_taxable],['CGST Collected',gst.total_cgst],['SGST Collected',gst.total_sgst],['IGST Collected',gst.total_igst],['Total GST Liability',gst.total_gst]].map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:`1px solid ${C.border}33`,fontSize:13}}>
                    <span style={{color:C.muted}}>{l}</span>
                    <span style={{fontWeight:700,color:l.includes('Total')?C.accent:C.text}}>₹{Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</span>
                  </div>
                ))}
              </div>
              <TableCard title="Invoices This Month">
                {(gst.invoices||[]).map((inv,i)=>(
                  <Row key={i} i={i}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{inv.invoice_number}</div>
                      <div style={{fontSize:11,color:C.muted}}>{inv.party_name} · {inv.party_gstin||'Unregistered'}</div>
                    </div>
                    <Badge color={gstTypeColor[inv.gst_type]}>{inv.gst_type==='cgst_sgst'?'CGST/SGST':'IGST'}</Badge>
                    <div style={{textAlign:'right',fontSize:12}}>
                      <div>Taxable: ₹{Number(inv.taxable_amount).toLocaleString()}</div>
                      <div style={{color:C.accent}}>GST: ₹{(Number(inv.cgst_amount)+Number(inv.sgst_amount)+Number(inv.igst_amount)).toLocaleString()}</div>
                    </div>
                  </Row>
                ))}
              </TableCard>
            </div>
          )}

          {/* RECURRING */}
          {tab==='recurring' && (
            <div>
              <div style={{background:`${C.orange}15`,border:`1px solid ${C.orange}33`,borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,color:C.orange,fontWeight:600}}>
                ⚠️ {recurring.length} recurring bills due — convert to invoices
              </div>
              <TableCard title="Recurring Bills Due">
                {recurring.length===0&&<div style={{padding:24,color:C.muted,textAlign:'center',fontSize:13}}>No recurring bills due 🎉</div>}
                {recurring.map((pi,i)=>(
                  <Row key={i} i={i}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{pi.party_name}</div>
                      <div style={{fontSize:11,color:C.muted}}>{pi.pi_number} · {pi.recurring_interval} · Due: {new Date(pi.next_renewal_date).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div style={{fontWeight:700,color:C.green}}>₹{Number(pi.total).toLocaleString()}</div>
                    <Btn onClick={()=>convertToInvoice(pi.id)} color={C.green} small>Generate Invoice</Btn>
                  </Row>
                ))}
              </TableCard>
            </div>
          )}
        </>
      )}

      {/* Invoice Detail */}
      {detail && tab==='invoices' && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:28,width:'100%',maxWidth:680,maxHeight:'90vh',overflowY:'auto'}} className="fade-in">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontSize:18,fontWeight:800}}>{detail.invoice_number}</div>
                <div style={{fontSize:12,color:C.muted}}>{detail.party_name}</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                {detail.status!=='paid'&&detail.status!=='cancelled'&&(
                  <Btn onClick={()=>setPayModal(true)} color={C.green} small>Record Payment</Btn>
                )}
                <button onClick={()=>setDetail(null)} style={{background:'none',border:'none',color:C.muted,fontSize:20,cursor:'pointer'}}>✕</button>
              </div>
            </div>

            {/* Items */}
            <div style={{background:C.surface,borderRadius:12,marginBottom:16,overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'3fr 1fr 1fr 1fr',padding:'10px 14px',fontSize:11,color:C.muted,fontWeight:700,textTransform:'uppercase',borderBottom:`1px solid ${C.border}`}}>
                <span>Description</span><span style={{textAlign:'center'}}>Qty</span><span style={{textAlign:'right'}}>Rate</span><span style={{textAlign:'right'}}>Amount</span>
              </div>
              {(detail.items||[]).map((it,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'3fr 1fr 1fr 1fr',padding:'10px 14px',borderBottom:`1px solid ${C.border}22`,fontSize:13}}>
                  <div>
                    <div style={{fontWeight:600}}>{it.description}</div>
                    {it.hsn_sac_code&&<div style={{fontSize:10,color:C.muted}}>HSN/SAC: {it.hsn_sac_code} · GST: {it.gst_rate}%</div>}
                  </div>
                  <div style={{textAlign:'center'}}>{it.quantity}</div>
                  <div style={{textAlign:'right'}}>₹{Number(it.unit_price).toLocaleString()}</div>
                  <div style={{textAlign:'right',fontWeight:700}}>₹{Number(it.amount).toLocaleString()}</div>
                </div>
              ))}
            </div>

            {/* Tax Breakup */}
            <div style={{background:C.surface,borderRadius:12,padding:'14px',marginBottom:16}}>
              {[['Subtotal',detail.subtotal],['Discount',detail.discount_amount],['Taxable Amount',detail.taxable_amount],
                ...(detail.gst_type==='cgst_sgst'?[['CGST',detail.cgst_amount],['SGST',detail.sgst_amount]]:[['IGST',detail.igst_amount]]),
                ...(detail.tds_amount>0?[['TDS Deducted',`(${detail.tds_amount})`]]:[])
              ].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${C.border}22`,fontSize:13}}>
                  <span style={{color:C.muted}}>{l}</span>
                  <span style={{fontWeight:600}}>₹{Number(v||0).toLocaleString()}</span>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0 6px',fontSize:16,fontWeight:800}}>
                <span>Total</span><span style={{color:C.green}}>₹{Number(detail.total).toLocaleString()}</span>
              </div>
              {detail.balance_due>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:C.orange,fontWeight:700}}>
                <span>Balance Due</span><span>₹{Number(detail.balance_due).toLocaleString()}</span>
              </div>}
            </div>

            {/* Payments */}
            {(detail.payments||[]).length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Payments Received</div>
                {detail.payments.map((p,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:C.surface,borderRadius:8,marginBottom:6,fontSize:13}}>
                    <span style={{color:C.muted}}>{new Date(p.payment_date).toLocaleDateString('en-IN')} · {p.payment_mode}</span>
                    <span style={{fontWeight:700,color:C.green}}>₹{Number(p.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <Modal title="Record Payment" onClose={()=>setPayModal(false)}>
          <Field label="Amount (₹)"><input type="number" value={payForm.amount} onChange={e=>setPayForm({...payForm,amount:e.target.value})} placeholder={`Max: ₹${detail?.balance_due}`} /></Field>
          <Field label="Payment Date"><input type="date" value={payForm.payment_date} onChange={e=>setPayForm({...payForm,payment_date:e.target.value})} /></Field>
          <Field label="Payment Mode">
            <select value={payForm.payment_mode} onChange={e=>setPayForm({...payForm,payment_mode:e.target.value})}>
              {['bank_transfer','upi','cash','cheque','card'].map(m=><option key={m} value={m}>{m.replace('_',' ')}</option>)}
            </select>
          </Field>
          <Field label="Reference / UTR Number"><input value={payForm.reference_number} onChange={e=>setPayForm({...payForm,reference_number:e.target.value})} placeholder="UTR / Cheque no." /></Field>
          <Btn onClick={recordPayment} color={C.green} style={{width:'100%'}}>Record Payment</Btn>
        </Modal>
      )}

      {/* Document Create Modal */}
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
          <div style={{width:'100%',maxWidth:820}}>
            <DocumentForm type={tab==='invoices'?'invoice':tab==='proforma'?'proforma':'quotation'} onClose={()=>setModal(null)} onSave={save} />
          </div>
        </div>
      )}
    </div>
  );
}