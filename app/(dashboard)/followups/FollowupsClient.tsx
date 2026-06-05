'use client';
import { useState } from 'react';

interface FollowUp {
  id: number; leadId: number; type: string; note: string;
  followUpDate: string; createdAt: string;
  leadName: string; leadPhone: string; leadStage: string; leadGender: string;
}

export default function FollowupsClient({ initial }: { initial: FollowUp[] }) {
  const [search, setSearch] = useState('');
  const [followups, setFollowups] = useState(initial);

  const deleteFollowup = async (id: number) => {
    if (!confirm('Is follow-up ko delete karo?')) return;
    await fetch('/api/followups', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activityId: id }) });
    setFollowups((prev) => prev.filter((f) => f.id !== id));
  };
  const [filter, setFilter] = useState<'all'|'overdue'|'today'|'upcoming'>('all');

  const today = new Date(); today.setHours(0,0,0,0);

  const getStatus = (dateStr: string) => {
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    if (d < today) return 'overdue';
    if (d.getTime() === today.getTime()) return 'today';
    return 'upcoming';
  };

  const filtered = followups.filter((f) => {
    const q = search.toLowerCase();
    const matchQ = !q || f.leadName.toLowerCase().includes(q) || f.leadPhone.includes(q) || f.note.toLowerCase().includes(q);
    const status = getStatus(f.followUpDate);
    const matchF = filter === 'all' || status === filter;
    return matchQ && matchF;
  });

  const counts = {
    overdue: followups.filter(f => getStatus(f.followUpDate) === 'overdue').length,
    today: followups.filter(f => getStatus(f.followUpDate) === 'today').length,
    upcoming: followups.filter(f => getStatus(f.followUpDate) === 'upcoming').length,
  };

  const statusStyle = (s: string) => {
    if (s === 'overdue') return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: '\u26a0\ufe0f Overdue' };
    if (s === 'today') return { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA', label: '\uD83D\uDD14 Aaj' };
    return { bg: '#F0FDF4', color: '#059669', border: '#BBF7D0', label: '\uD83D\uDCC5 Upcoming' };
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Follow-ups</div>
          <div className="topbar-sub">{followups.length} total &middot; {counts.overdue} overdue &middot; {counts.today} aaj</div>
        </div>
      </div>

      <div className="page-content">
        <div className="grid-layout grid-4" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total', value: initial.length, color: '#1A56DB', bg: '#EFF6FF', icon: 'fas fa-list', f: 'all' },
            { label: 'Overdue', value: counts.overdue, color: '#DC2626', bg: '#FEF2F2', icon: 'fas fa-exclamation-triangle', f: 'overdue' },
            { label: 'Aaj', value: counts.today, color: '#EA580C', bg: '#FFF7ED', icon: 'fas fa-bell', f: 'today' },
            { label: 'Upcoming', value: counts.upcoming, color: '#059669', bg: '#F0FDF4', icon: 'fas fa-calendar', f: 'upcoming' },
          ].map((s) => (
            <div key={s.label} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setFilter(s.f as any)}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 10 }}>
                <i className={s.icon} />
              </div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="form-input" placeholder="Search lead naam ya phone..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 280, height: 38 }} />
          {(['all','overdue','today','upcoming'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 16px', borderRadius: 20, border: '1.5px solid ' + (filter===f ? '#1A56DB' : 'var(--border)'), background: filter===f ? '#1A56DB' : 'white', color: filter===f ? 'white' : 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {f === 'all' ? 'All' : f === 'overdue' ? 'Overdue (' + counts.overdue + ')' : f === 'today' ? 'Aaj (' + counts.today + ')' : 'Upcoming (' + counts.upcoming + ')'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <i className="fas fa-calendar-check" style={{ fontSize: 48, color: 'var(--text4)', marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)' }}>Koi follow-up nahi mila</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>Activity log karte waqt follow-up date set karo</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((f) => {
              const status = getStatus(f.followUpDate);
              const st = statusStyle(status);
              const salutation = f.leadGender === 'Female' ? "Ma'am" : 'Sir';
              const phone = f.leadPhone.replace(/\D/g, '');
              const waMsg = encodeURIComponent('Assalam O Alaikum');
              const waUrl = 'https://api.whatsapp.com/send?phone=' + phone + '&text=' + waMsg + '&app_absent=0';
              return (
                <div key={f.id} className="card" style={{ padding: '16px 20px', border: '1.5px solid ' + st.border }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: st.bg, color: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                      {f.leadName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{f.leadName}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color, border: '1px solid ' + st.border, fontWeight: 600 }}>{st.label}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--blue-bg)', color: 'var(--accent)', fontWeight: 600 }}>{f.leadStage}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                        <i className="fas fa-phone-alt" style={{ marginRight: 5 }} />{f.leadPhone}
                      </div>
                      {f.note && (() => {
                        let isDeal = false;
                        let dealData: any = null;
                        try { dealData = JSON.parse(f.note); isDeal = !!dealData?.siteVisit; } catch {}
                        if (isDeal && dealData) {
                          return (
                            <div style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', borderLeft: '3px solid ' + st.color, marginBottom: 8 }}>
                              {dealData.siteVisit?.date && <div><strong>📅 Site Visit:</strong> {dealData.siteVisit.date} {dealData.siteVisit.time} — {dealData.siteVisit.location} {dealData.siteVisit.agent ? '(' + dealData.siteVisit.agent + ')' : ''}</div>}
                              {dealData.paymentPlan?.totalPrice && <div><strong>💰 Total:</strong> PKR {Number(dealData.paymentPlan.totalPrice).toLocaleString()} | Down: {Number(dealData.paymentPlan.downpayment||0).toLocaleString()} | Monthly: {Number(dealData.paymentPlan.monthlyInstallment||0).toLocaleString()}</div>}
                              {dealData.nextConnection?.date && <div><strong>📞 Next:</strong> {dealData.nextConnection.date} via {dealData.nextConnection.type} — {dealData.nextConnection.note}</div>}
                            </div>
                          );
                        }
                        return (
                          <div style={{ fontSize: 13, color: 'var(--text2)', background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', borderLeft: '3px solid ' + st.color, marginBottom: 8 }}>
                            {f.note}
                          </div>
                        );
                      })()}
                      <div style={{ fontSize: 11, color: 'var(--text4)' }}>
                        Follow-up: <strong style={{ color: st.color }}>{fmt(f.followUpDate)}</strong>
                        <span style={{ marginLeft: 12 }}>Logged: {fmt(f.createdAt)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <a href={waUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: '#25D366', color: 'white', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                        <i className="fab fa-whatsapp" /> WhatsApp
                      </a>
                      <a href={'tel:' + f.leadPhone} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'var(--accent)', color: 'white', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                        <i className="fas fa-phone-alt" /> Call
                      </a>
                      <button onClick={() => deleteFollowup(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        <i className="fas fa-trash" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
