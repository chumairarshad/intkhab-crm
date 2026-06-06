'use client';
import { useState } from 'react';

interface InvoiceItem {
  id?: number;
  description: string;
  leadCount: number;
  pricePerLead: number;
  total: number;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  agentId: number;
  agentName?: string;
  status: 'draft' | 'sent' | 'paid';
  issueDate: string;
  dueDate: string;
  notes: string;
  totalAmount: number;
  items: InvoiceItem[];
  createdAt: string;
}

interface Agent { id: number; name: string; email: string; }

function formatPKR(n: number) {
  return '₨' + n.toLocaleString('en-PK');
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'badge-viewing',
  sent: 'badge-new',
  paid: 'badge-closed',
};

export default function InvoicesClient({
  initial, agents, isAdmin, currentAgentId, currentAgentName
}: {
  initial: Invoice[]; agents: Agent[]; isAdmin: boolean;
  currentAgentId: number; currentAgentName: string;
}) {
  const [invoices, setInvoices] = useState<Invoice[]>(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Form state
  const [formAgentId, setFormAgentId] = useState<number>(currentAgentId);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', leadCount: 10, pricePerLead: 1600, total: 16000 }]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const recalcItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: field === 'description' ? value : Number(value) };
      updated.total = updated.leadCount * updated.pricePerLead;
      return updated;
    }));
  };

  const totalAmount = items.reduce((s, it) => s + it.total, 0);

  const handleCreate = async () => {
    if (items.some(it => !it.description || it.leadCount <= 0 || it.pricePerLead <= 0)) {
      flash('Please fill all item fields correctly.'); return;
    }
    setLoading(true);
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: formAgentId, issueDate, dueDate, notes, items }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { flash(data.error || 'Error creating invoice'); return; }
    setInvoices([data, ...invoices]);
    setShowCreate(false);
    resetForm();
    flash('Invoice created successfully!');
  };

  const resetForm = () => {
    setFormAgentId(currentAgentId);
    setIssueDate(new Date().toISOString().slice(0, 10));
    const d = new Date(); d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().slice(0, 10));
    setNotes('');
    setItems([{ description: '', leadCount: 10, pricePerLead: 1600, total: 16000 }]);
  };

  const handleStatusChange = async (inv: Invoice, status: Invoice['status']) => {
    const res = await fetch(`/api/invoices/${inv.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setInvoices(invoices.map(i => i.id === inv.id ? { ...i, status } : i));
      if (viewInvoice?.id === inv.id) setViewInvoice({ ...viewInvoice, status });
      flash('Status updated!');
    }
  };

  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`Delete ${inv.invoiceNumber}? This cannot be undone.`)) return;
    const res = await fetch(`/api/invoices/${inv.id}`, { method: 'DELETE' });
    if (res.ok) {
      setInvoices(invoices.filter(i => i.id !== inv.id));
      if (viewInvoice?.id === inv.id) setViewInvoice(null);
      flash('Invoice deleted.');
    }
  };

  const printInvoice = (inv: Invoice) => {
    const agentN = inv.agentName || agents.find(a => a.id === inv.agentId)?.name || 'Agent';
    const rows = inv.items.map(it => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #E2E8F0">${it.description}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #E2E8F0;text-align:center">${it.leadCount}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #E2E8F0;text-align:right">₨${it.pricePerLead.toLocaleString()}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:600">₨${it.total.toLocaleString()}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>${inv.invoiceNumber}</title>
      <style>body{font-family:Arial,sans-serif;margin:40px;color:#1E293B}h1{color:#1A56DB}table{width:100%;border-collapse:collapse}th{background:#F8FAFC;padding:10px 14px;text-align:left;border-bottom:2px solid #E2E8F0}</style>
      </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px">
        <div><h1>🏠 Fill My Calendar</h1><div style="color:#64748B;font-size:13px">Team Intkhab</div></div>
        <div style="text-align:right"><div style="font-size:22px;font-weight:800;color:#1A56DB">${inv.invoiceNumber}</div>
          <div style="margin-top:4px;padding:4px 12px;background:${inv.status==='paid'?'#D1FAE5':inv.status==='sent'?'#DBEAFE':'#FEF3C7'};color:${inv.status==='paid'?'#059669':inv.status==='sent'?'#1A56DB':'#D97706'};border-radius:20px;font-size:12px;font-weight:700;display:inline-block;text-transform:uppercase">${inv.status}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:32px">
        <div style="background:#F8FAFC;padding:16px;border-radius:10px"><div style="font-size:11px;color:#94A3B8;font-weight:700;text-transform:uppercase;margin-bottom:8px">Bill To</div>
          <div style="font-weight:700;font-size:15px">${agentN}</div></div>
        <div style="background:#F8FAFC;padding:16px;border-radius:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#64748B;font-size:13px">Issue Date</span><span style="font-weight:600;font-size:13px">${inv.issueDate}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#64748B;font-size:13px">Due Date</span><span style="font-weight:600;font-size:13px">${inv.dueDate}</span></div>
        </div>
      </div>
      <table><thead><tr><th>Description</th><th style="text-align:center">Leads</th><th style="text-align:right">Price/Lead</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div style="text-align:right;margin-top:20px;padding:16px;background:#EFF6FF;border-radius:10px">
        <span style="font-size:14px;color:#64748B;margin-right:20px">Total Amount</span>
        <span style="font-size:22px;font-weight:800;color:#1A56DB">₨${inv.totalAmount.toLocaleString()}</span>
      </div>
      ${inv.notes ? `<div style="margin-top:20px;padding:14px;background:#F8FAFC;border-radius:10px;font-size:13px;color:#64748B"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  return (
    <>
      {/* ── Topbar ── */}
      <div className="topbar" style={{ paddingLeft: 60 }}>
        <div>
          <div className="topbar-title">Invoices</div>
          <div className="topbar-sub">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="topbar-actions">
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowCreate(true); }}>
              <i className="fas fa-plus"></i> <span className="hide-xs">New Invoice</span>
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        {msg && (
          <div style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
            <i className="fas fa-check-circle" style={{ marginRight: 8 }}></i>{msg}
          </div>
        )}

        {/* ── Invoice Table ── */}
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  {isAdmin && <th>Agent</th>}
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && (
                  <tr><td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40, fontSize: 13 }}>
                    No invoices yet. Create your first invoice!
                  </td></tr>
                )}
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>{inv.invoiceNumber}</span>
                    </td>
                    {isAdmin && <td style={{ fontSize: 13 }}>{inv.agentName || '—'}</td>}
                    <td style={{ fontSize: 13, color: 'var(--text2)' }}>{inv.issueDate}</td>
                    <td style={{ fontSize: 13, color: 'var(--text2)' }}>{inv.dueDate}</td>
                    <td style={{ fontWeight: 700, fontSize: 13 }}>{formatPKR(inv.totalAmount)}</td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[inv.status]}`} style={{ textTransform: 'capitalize' }}>
                        {inv.status === 'paid' && <i className="fas fa-check-circle" />}
                        {inv.status === 'sent' && <i className="fas fa-paper-plane" />}
                        {inv.status === 'draft' && <i className="fas fa-pencil-alt" />}
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setViewInvoice(inv)} title="View">
                          <i className="fas fa-eye" />
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => printInvoice(inv)} title="Print">
                          <i className="fas fa-print" />
                        </button>
                        {isAdmin && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(inv)} title="Delete">
                            <i className="fas fa-trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════════ CREATE MODAL ══════════════════ */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--card)', borderRadius: 16, width: '100%', maxWidth: 680, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                <i className="fas fa-file-invoice-dollar" style={{ marginRight: 10, color: 'var(--accent)' }} />
                New Invoice
              </h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>✕</button>
            </div>

            {/* Agent (admin only) */}
            {isAdmin && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Agent</label>
                <select className="form-input" value={formAgentId} onChange={e => setFormAgentId(Number(e.target.value))}>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Issue Date</label>
                <input className="form-input" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Due Date</label>
                <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>

            {/* Items */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>Lead Items</label>
                <button className="btn btn-outline btn-sm" onClick={() => setItems([...items, { description: '', leadCount: 10, pricePerLead: 1600, total: 16000 }])}>
                  <i className="fas fa-plus" /> Add Row
                </button>
              </div>

              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 120px 110px 36px', gap: 8, marginBottom: 6 }}>
                {['Description', 'Leads', 'Price/Lead', 'Total', ''].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>

              {items.map((it, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 100px 120px 110px 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input className="form-input" placeholder="e.g. January Leads" value={it.description} onChange={e => recalcItem(idx, 'description', e.target.value)} />
                  <input className="form-input" type="number" min="1" value={it.leadCount} onChange={e => recalcItem(idx, 'leadCount', e.target.value)} />
                  <input className="form-input" type="number" min="1" value={it.pricePerLead} onChange={e => recalcItem(idx, 'pricePerLead', e.target.value)} />
                  <div style={{ background: 'var(--accent)', color: 'white', borderRadius: 8, padding: '9px 10px', fontSize: 12, fontWeight: 700, textAlign: 'right' }}>
                    {formatPKR(it.total)}
                  </div>
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={items.length === 1}>
                    <i className="fas fa-times" />
                  </button>
                </div>
              ))}

              {/* Total */}
              <div style={{ background: 'var(--green-bg)', border: '1px solid #A7F3D0', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>Total Amount</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>{formatPKR(totalAmount)}</span>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Notes (optional)</label>
              <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms, bank details, etc." />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? <><i className="fas fa-spinner fa-spin" /> Saving…</> : <><i className="fas fa-file-invoice-dollar" /> Create Invoice</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ VIEW MODAL ══════════════════ */}
      {viewInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--card)', borderRadius: 16, width: '100%', maxWidth: 660, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            {/* Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>INVOICE</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{viewInvoice.invoiceNumber}</div>
                <div style={{ marginTop: 6 }}>
                  <span className={`badge ${STATUS_COLORS[viewInvoice.status]}`} style={{ textTransform: 'capitalize' }}>
                    {viewInvoice.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewInvoice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>✕</button>
            </div>

            {/* Meta */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Bill To</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{viewInvoice.agentName || agents.find(a => a.id === viewInvoice.agentId)?.name || 'Agent'}</div>
              </div>
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>Issue Date</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{viewInvoice.issueDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>Due Date</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{viewInvoice.dueDate}</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="table-wrap" style={{ marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ textAlign: 'center' }}>Leads</th>
                    <th style={{ textAlign: 'right' }}>Price/Lead</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewInvoice.items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 13 }}>{it.description}</td>
                      <td style={{ textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{it.leadCount}</td>
                      <td style={{ textAlign: 'right', fontSize: 13 }}>{formatPKR(it.pricePerLead)}</td>
                      <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{formatPKR(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Grand Total */}
            <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>Total Amount</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{formatPKR(viewInvoice.totalAmount)}</span>
            </div>

            {viewInvoice.notes && (
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: 'var(--text2)' }}>
                <strong>Notes:</strong> {viewInvoice.notes}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {viewInvoice.status === 'draft' && (
                <button className="btn btn-outline" onClick={() => handleStatusChange(viewInvoice, 'sent')}>
                  <i className="fas fa-paper-plane" /> Mark as Sent
                </button>
              )}
              {viewInvoice.status === 'sent' && (
                <button className="btn btn-primary" onClick={() => handleStatusChange(viewInvoice, 'paid')}>
                  <i className="fas fa-check-circle" /> Mark as Paid
                </button>
              )}
              {viewInvoice.status === 'paid' && (
                <button className="btn btn-outline" onClick={() => handleStatusChange(viewInvoice, 'sent')}>
                  <i className="fas fa-undo" /> Mark as Sent
                </button>
              )}
              <button className="btn btn-outline" onClick={() => printInvoice(viewInvoice)}>
                <i className="fas fa-print" /> Print / PDF
              </button>
              {isAdmin && (
                <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={() => handleDelete(viewInvoice)}>
                  <i className="fas fa-trash" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
