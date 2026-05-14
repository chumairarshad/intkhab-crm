'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface BriefData {
  userName: string;
  totalLeads: number;
  newLeads: number;
  negotiating: number;
  closed: number;
  todayEvents: { id: number; title: string; eventType: string; time: string }[];
  untouchedLeads: { id: number; name: string; stage: string; phone: string }[];
  hotLeads: { id: number; name: string; phone: string }[];
}

export default function DailyBriefing({ data }: { data: BriefData }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const key = `brief_dismissed_${new Date().toDateString()}`;
    if (!sessionStorage.getItem(key)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    const key = `brief_dismissed_${new Date().toDateString()}`;
    sessionStorage.setItem(key, '1');
    setDismissed(true);
    setVisible(false);
  };

  if (!visible || dismissed) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Subah Bakhair' : hour < 17 ? 'Assalam o Alaikum' : 'Sham Bakhair';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={dismiss}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 540, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1A56DB 0%, #0EA5E9 100%)', borderRadius: '18px 18px 0 0', padding: '22px 24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginBottom: 4 }}>
                {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
                {greeting}, {data.userName.split(' ')[0]}! 👋
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>
                Aaj ka brief tayaar hai — 30 second mein plan karo
              </div>
            </div>
            <button onClick={dismiss} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 32, height: 32, color: 'white', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 18 }}>
            {[
              { label: 'Total Leads', value: data.totalLeads, icon: 'fas fa-users' },
              { label: 'New', value: data.newLeads, icon: 'fas fa-user-plus' },
              { label: 'Negotiating', value: data.negotiating, icon: 'fas fa-handshake' },
              { label: 'Closed', value: data.closed, icon: 'fas fa-check-circle' },
            ].map((s) => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>

          {/* Today's Events */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-calendar-day" style={{ color: '#059669' }}></i> Aaj ke Events ({data.todayEvents.length})
            </div>
            {data.todayEvents.length === 0 ? (
              <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--text3)' }}>
                📭 Aaj koi event scheduled nahi — <Link href="/calendar" style={{ color: '#1A56DB', fontWeight: 600 }} onClick={dismiss}>Calendar pe jao</Link>
              </div>
            ) : data.todayEvents.map((ev) => (
              <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 12px', background: '#F0FDF4', borderRadius: 10, marginBottom: 6, border: '1px solid #BBF7D0' }}>
                <i className="fas fa-clock" style={{ color: '#059669', fontSize: 12 }}></i>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>{ev.title}</span>
                  <span style={{ fontSize: 11, color: '#059669', marginLeft: 8 }}>{ev.time}</span>
                </div>
                <span style={{ fontSize: 10, background: '#059669', color: 'white', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{ev.eventType}</span>
              </div>
            ))}
          </div>

          {/* Untouched Leads */}
          {data.untouchedLeads.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#EF4444' }}></i> Follow-up Pending ({data.untouchedLeads.length})
              </div>
              <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '4px 0', border: '1px solid #FECACA' }}>
                {data.untouchedLeads.slice(0, 5).map((l, i) => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: i < Math.min(data.untouchedLeads.length, 5) - 1 ? '1px solid #FECACA' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EF4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {l.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#7F1D1D' }}>{l.name}</div>
                      <div style={{ fontSize: 11, color: '#DC2626' }}>{l.stage} · {l.phone}</div>
                    </div>
                    <a href={`https://api.whatsapp.com/send?phone=${l.phone.replace(/\D/g,'')}&text=${encodeURIComponent(`Assalam o Alaikum ${l.name}, How are you?`)}&app_absent=0`}
                      target="_blank" rel="noreferrer" onClick={dismiss}
                      style={{ background: '#25D366', color: 'white', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="fab fa-whatsapp"></i> Message
                    </a>
                  </div>
                ))}
                {data.untouchedLeads.length > 5 && (
                  <div style={{ padding: '8px 12px', fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
                    + {data.untouchedLeads.length - 5} more pending...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hot Leads */}
          {data.hotLeads.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-fire" style={{ color: '#EA580C' }}></i> Hot Leads — Close karo aaj! ({data.hotLeads.length})
              </div>
              <div style={{ background: '#FFF7ED', borderRadius: 10, padding: '4px 0', border: '1px solid #FED7AA' }}>
                {data.hotLeads.map((l, i) => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: i < data.hotLeads.length - 1 ? '1px solid #FED7AA' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EA580C', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      🔥
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#7C2D12' }}>{l.name}</div>
                      <div style={{ fontSize: 11, color: '#C2410C' }}>Negotiating · {l.phone}</div>
                    </div>
                    <a href={`tel:${l.phone}`}
                      style={{ background: '#1A56DB', color: 'white', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="fas fa-phone-alt"></i> Call
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/leads" onClick={dismiss}
              style={{ flex: 1, background: '#1A56DB', color: 'white', borderRadius: 10, padding: '12px', textAlign: 'center', fontWeight: 700, fontSize: 13, textDecoration: 'none', display: 'block' }}>
              📋 Leads Kholo
            </Link>
            <button onClick={dismiss}
              style={{ flex: 1, background: '#F1F5F9', color: 'var(--text2)', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Baad Mein Dekhta Hun
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
