'use client';
import { useState } from 'react';

interface Deal {
  id: number; leadId: number; note: string; followUpDate: string; createdAt: string;
  leadName: string; leadPhone: string; leadStage: string; leadGender: string;
  agentId: number; agentName: string;
}
interface LeadOption { id: number; name: string; phone: string; agentId: number; }

function formatDate(str: string) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatPKR(val: string) {
  const n = Number(val); if (!n) return '—';
  if (n >= 10000000) return `₨${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₨${(n / 100000).toFixed(1)}L`;
  return `₨${n.toLocaleString()}`;
}
const AGENT_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4'];
function agentColor(id: number) { return AGENT_COLORS[id % AGENT_COLORS.length]; }
function agentInitials(name: string) { return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(); }

const emptyForm = {
  leadId: '', siteVisitDate: '', siteVisitTime: '', siteLocation: '', siteAgent: '',
  totalPrice: '', downpayment: '', monthlyInstallment: '', totalInstallments: '', duration: '',
  nextDate: '', nextType: 'call' as 'call' | 'whatsapp' | 'visit', nextNote: '',
};

export default function DealsClient({ initial, leads, isAdmin }: { initial: Deal[]; leads: LeadOption[]; isAdmin: boolean; }) {
  const [deals, setDeals] = useState(initial);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const filtered = deals.filter((d) => {
    const q = search.toLowerCase();
    return d.leadName.toLowerCase().includes(q) || d.leadPhone.toLowerCase().includes(q) || d.agentName.toLowerCase().includes(q);
  });

  const handleSave = async () => {
    if (!form.leadId) { flash('⚠️ Pehle lead select karo'); return; }
    setSaving(true);
    const dealData = {
      siteVisit: { date: form.siteVisitDate, time: form.siteVisitTime, location: form.siteLocation, agent: form.siteAgent },
      paymentPlan: { totalPrice: form.totalPrice, downpayment: form.downpayment, monthlyInstallment: form.monthlyInstallment, totalInstallments: form.totalInstallments, duration: form.duration },
      nextConnection: { date: form.nextDate, type: form.nextType, note: form.nextNote },
    };
    try {
      const res = await fetch(`/api/leads/${form.leadId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'log_activity', type: 'deal', note: JSON.stringify(dealData), audioUrl: '', followUpDate: form.nextDate }),
      });
      if (!res.ok) throw new Error('Failed');
      setShowModal(false); setForm(emptyForm); setLeadSearch('');
      flash('🤝 Deal save ho gaya!');
      setTimeout(() => window.location.reload(), 1000);
    } catch { flash('❌ Error saving deal'); }
    setSaving(false);
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      {msg && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#059669', color: '#fff', padding: '10px 20px', borderRadius: 10, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
          🤝 Deals
          <span style={{ marginLeft: '10px', fontSize: '13px', fontWeight: 500, background: '#DBEAFE', color: '#1D4ED8', borderRadius: '12px', padding: '2px 10px' }}>{filtered.length}</span>
        </h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="text" placeholder="Search deals…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px 14px', fontSize: '14px', width: '220px', outline: 'none' }} />
          <button onClick={() => { setForm(emptyForm); setShowModal(true); }}
            style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-plus" /> Add Deal
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th style={th}>Lead</th><th style={th}>Phone</th><th style={th}>Stage</th>
              {isAdmin && <th style={th}>Agent</th>}
              <th style={th}>Site Visit</th><th style={th}>Payment</th><th style={th}>Follow-Up</th><th style={th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Koi deal nahi. "Add Deal" dabao!</td></tr>
            ) : filtered.map((d, i) => {
              let parsed: any = null; try { parsed = JSON.parse(d.note); } catch {}
              return (
                <tr key={d.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td style={td}><div style={{ fontWeight: 600 }}>{d.leadName}</div><div style={{ fontSize: 12, color: '#6B7280' }}>{d.leadGender || '—'}</div></td>
                  <td style={td}>{d.leadPhone}</td>
                  <td style={td}><span style={{ background: '#DCFCE7', color: '#15803D', borderRadius: '999px', padding: '2px 10px', fontSize: 12, fontWeight: 500 }}>{d.leadStage}</span></td>
                  {isAdmin && (
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: agentColor(d.agentId), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{agentInitials(d.agentName)}</div>
                        <span>{d.agentName}</span>
                      </div>
                    </td>
                  )}
                  <td style={td}>{parsed?.siteVisit?.date ? (<div><div style={{ fontSize: 12, fontWeight: 600 }}>{formatDate(parsed.siteVisit.date)}</div><div style={{ fontSize: 11, color: '#6B7280' }}>{parsed.siteVisit.location || '—'}</div></div>) : '—'}</td>
                  <td style={td}>{parsed?.paymentPlan?.totalPrice ? (<div><div style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>{formatPKR(parsed.paymentPlan.totalPrice)}</div><div style={{ fontSize: 11, color: '#6B7280' }}>Down: {formatPKR(parsed.paymentPlan.downpayment)}</div></div>) : '—'}</td>
                  <td style={td}>{formatDate(d.followUpDate)}</td>
                  <td style={{ ...td, color: '#6B7280', fontSize: 13 }}>{formatDate(d.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Deal Modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🤝 Naya Deal Add Karo</h2>
              <button onClick={() => { setShowModal(false); setLeadSearch(''); }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6B7280' }}>×</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Lead Select Karo *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  style={{ ...inp, cursor: 'pointer' }}
                  placeholder="Lead ka naam ya phone likho..."
                  value={leadSearch}
                  onFocus={() => setShowLeadDropdown(true)}
                  onChange={(e) => { setLeadSearch(e.target.value); setShowLeadDropdown(true); setForm({ ...form, leadId: '' }); }}
                />
                {showLeadDropdown && (
                  <>
                    <div onClick={() => setShowLeadDropdown(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #D1D5DB', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto', zIndex: 20 }}>
                      {leads
                        .filter((l) => {
                          const q = leadSearch.toLowerCase();
                          return l.name.toLowerCase().includes(q) || l.phone.toLowerCase().includes(q);
                        })
                        .map((l) => (
                          <div
                            key={l.id}
                            onClick={() => { setForm({ ...form, leadId: String(l.id) }); setLeadSearch(`${l.name} — ${l.phone}`); setShowLeadDropdown(false); }}
                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6', fontSize: 13 }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDF4')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                          >
                            <span style={{ fontWeight: 600 }}>{l.name}</span>
                            <span style={{ color: '#6B7280', marginLeft: 8 }}>{l.phone}</span>
                          </div>
                        ))}
                      {leads.filter((l) => { const q = leadSearch.toLowerCase(); return l.name.toLowerCase().includes(q) || l.phone.toLowerCase().includes(q); }).length === 0 && (
                        <div style={{ padding: '12px 14px', color: '#9CA3AF', fontSize: 13 }}>Koi lead nahi mili</div>
                      )}
                    </div>
                  </>
                )}
              </div>
              {form.leadId && <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>✓ Lead selected</div>}
            </div>

            <div style={sec}>
              <div style={secTitle}>📍 Site Visit</div>
              <div style={g2}>
                <div><label style={lbl}>Date</label><input type="date" style={inp} value={form.siteVisitDate} onChange={(e) => setForm({ ...form, siteVisitDate: e.target.value })} /></div>
                <div><label style={lbl}>Time</label><input type="time" style={inp} value={form.siteVisitTime} onChange={(e) => setForm({ ...form, siteVisitTime: e.target.value })} /></div>
                <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Project / Location</label><input type="text" style={inp} placeholder="e.g. Bahria Town Phase 8" value={form.siteLocation} onChange={(e) => setForm({ ...form, siteLocation: e.target.value })} /></div>
                <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Dikhane wala (Agent)</label><input type="text" style={inp} placeholder="Agent ya staff ka naam" value={form.siteAgent} onChange={(e) => setForm({ ...form, siteAgent: e.target.value })} /></div>
              </div>
            </div>

            <div style={sec}>
              <div style={{ ...secTitle, color: '#059669' }}>💰 Payment Plan</div>
              <div style={g2}>
                <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Total Price (PKR)</label><input type="number" style={inp} placeholder="e.g. 15000000" value={form.totalPrice} onChange={(e) => setForm({ ...form, totalPrice: e.target.value })} /></div>
                <div><label style={lbl}>Downpayment (PKR)</label><input type="number" style={inp} placeholder="e.g. 3000000" value={form.downpayment} onChange={(e) => setForm({ ...form, downpayment: e.target.value })} /></div>
                <div><label style={lbl}>Monthly Installment</label><input type="number" style={inp} placeholder="e.g. 200000" value={form.monthlyInstallment} onChange={(e) => setForm({ ...form, monthlyInstallment: e.target.value })} /></div>
                <div><label style={lbl}>Total Installments</label><input type="number" style={inp} placeholder="e.g. 60" value={form.totalInstallments} onChange={(e) => setForm({ ...form, totalInstallments: e.target.value })} /></div>
                <div><label style={lbl}>Duration</label><input type="text" style={inp} placeholder="e.g. 5 years" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
              </div>
            </div>

            <div style={sec}>
              <div style={{ ...secTitle, color: '#7C3AED' }}>📅 Next Connection</div>
              <div style={g2}>
                <div><label style={lbl}>Date</label><input type="date" style={inp} value={form.nextDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setForm({ ...form, nextDate: e.target.value })} /></div>
                <div><label style={lbl}>Type</label>
                  <select style={inp} value={form.nextType} onChange={(e) => setForm({ ...form, nextType: e.target.value as any })}>
                    <option value="call">📞 Call</option><option value="whatsapp">💬 WhatsApp</option><option value="visit">🏠 Visit</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Note</label><textarea style={{ ...inp, resize: 'none' } as any} rows={2} placeholder="Kya discuss karna hai..." value={form.nextNote} onChange={(e) => setForm({ ...form, nextNote: e.target.value })} /></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => { setShowModal(false); setLeadSearch(''); }} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : '🤝 Save Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' };
const td: React.CSSProperties = { padding: '12px 16px', verticalAlign: 'middle' };
const lbl: React.CSSProperties = { fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4, fontWeight: 600 };
const inp: React.CSSProperties = { width: '100%', border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const sec: React.CSSProperties = { background: '#F9FAFB', borderRadius: 10, padding: '14px', border: '1px solid #E5E7EB', marginBottom: 14 };
const secTitle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 };
const g2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 };
