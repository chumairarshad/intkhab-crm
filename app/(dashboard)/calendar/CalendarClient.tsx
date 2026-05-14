'use client';
import { useState } from 'react';

interface CalEvent {
  id: number; title: string; description: string;
  startTime: string; endTime: string; leadId: number | null;
  agentId: number; eventType: string; createdAt: string;
}
interface Lead { id: number; name: string; }

const EVENT_TYPES = ['Call', 'Viewing', 'Meeting', 'Contract Signing', 'Follow-up'];

export default function CalendarClient({ events: initial, leads, currentUserId }: {
  events: CalEvent[]; leads: Lead[]; currentUserId: number;
}) {
  const [events, setEvents] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [msg, setMsg] = useState('');
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [search, setSearch] = useState('');

  const searchQ = search.toLowerCase();
  const upcoming = events
    .filter((e) => new Date(e.startTime) > new Date())
    .filter((e) => !searchQ || e.title.toLowerCase().includes(searchQ) || e.eventType.toLowerCase().includes(searchQ) || (e.description || '').toLowerCase().includes(searchQ))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const past = events
    .filter((e) => new Date(e.startTime) <= new Date())
    .filter((e) => !searchQ || e.title.toLowerCase().includes(searchQ) || e.eventType.toLowerCase().includes(searchQ) || (e.description || '').toLowerCase().includes(searchQ))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 10);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd);
    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setEvents([...events, data]);
    setShowModal(false);
    setMsg('Event scheduled!');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this event?')) return;
    await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
    setEvents(events.filter((e) => e.id !== id));
    setMsg('Event deleted.');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleGCalSync = async () => {
    setGcalSyncing(true);
    // Generate Google Calendar links for all upcoming events
    const links = upcoming.map((ev) => {
      const start = new Date(ev.startTime).toISOString().replace(/[-:]/g, '').replace('.000', '');
      const end = new Date(ev.endTime).toISOString().replace(/[-:]/g, '').replace('.000', '');
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: ev.title,
        dates: `${start}/${end}`,
        details: ev.description || `Event Type: ${ev.eventType}`,
      });
      return `https://calendar.google.com/calendar/render?${params}`;
    });
    if (links.length === 0) {
      setMsg('No upcoming events to sync to Google Calendar.');
      setGcalSyncing(false);
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    // Open first event in Google Calendar
    window.open(links[0], '_blank');
    if (links.length > 1) {
      setMsg(`✅ Opening ${links.length} events in Google Calendar... (opening first one)`);
    } else {
      setMsg('✅ Event opened in Google Calendar!');
    }
    setGcalSyncing(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' +
      d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Calendar</div>
          <div className="topbar-sub">{upcoming.length} upcoming events</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 320 }}>
            <input
              className="form-input"
              placeholder="🔍 Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ height: 36, fontSize: 13 }}
            />
          </div>
        <div className="topbar-actions">
          <button
            className="btn btn-outline"
            onClick={handleGCalSync}
            disabled={gcalSyncing}
            style={{ color: '#EA4335', borderColor: '#FECACA', background: '#FEF2F2' }}
            title="Add upcoming events to Google Calendar"
          >
            {gcalSyncing
              ? <><i className="fas fa-spinner fa-spin"></i> <span className="hide-xs">Syncing...</span></>
              : <><i className="fab fa-google" style={{ fontSize: 13 }}></i> <span className="hide-xs">Google Cal</span></>}
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <i className="fas fa-plus"></i> Schedule Event
          </button>
        </div>
      </div>
      <div className="page-content">
        {msg && <div style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>{msg}</div>}

        <div className="grid-layout grid-2">
          <div className="card">
            <div className="card-header">
              <span className="card-title"><i className="fas fa-calendar-check" style={{ color: '#059669', marginRight: 8 }}></i>Upcoming</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{upcoming.length} events</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 20px' }}>
                <i className="fas fa-calendar" style={{ fontSize: 32, opacity: 0.3 }}></i>
                <p style={{ marginTop: 10, fontSize: 13 }}>No upcoming events</p>
              </div>
            ) : upcoming.map((ev) => (
              <div key={ev.id} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ width: 44, height: 44, background: '#EFF6FF', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#1A56DB', lineHeight: 1 }}>{new Date(ev.startTime).getDate()}</span>
                  <span style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>{new Date(ev.startTime).toLocaleDateString('en', { month: 'short' })}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{fmt(ev.startTime)}</div>
                  {ev.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{ev.description}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span className="badge badge-new" style={{ fontSize: 10 }}>{ev.eventType}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-sm"
                      title="Add to Google Calendar"
                      style={{ background: '#FEF2F2', color: '#EA4335', border: '1px solid #FECACA', padding: '4px 8px' }}
                      onClick={() => {
                        const start = new Date(ev.startTime).toISOString().replace(/[-:]/g, '').replace('.000', '');
                        const end = new Date(ev.endTime).toISOString().replace(/[-:]/g, '').replace('.000', '');
                        const params = new URLSearchParams({ action: 'TEMPLATE', text: ev.title, dates: `${start}/${end}`, details: ev.description || ev.eventType });
                        window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank');
                      }}
                    >
                      <i className="fab fa-google" style={{ fontSize: 11 }}></i>
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ev.id)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title"><i className="fas fa-history" style={{ color: 'var(--text3)', marginRight: 8 }}></i>Past Events</span>
            </div>
            {past.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 20px' }}>
                <i className="fas fa-calendar-times" style={{ fontSize: 32, opacity: 0.3 }}></i>
                <p style={{ marginTop: 10, fontSize: 13 }}>No past events</p>
              </div>
            ) : past.map((ev) => (
              <div key={ev.id} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: '1px solid #F1F5F9', opacity: 0.7 }}>
                <div style={{ width: 40, height: 40, background: '#F8FAFC', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text3)', lineHeight: 1 }}>{new Date(ev.startTime).getDate()}</span>
                  <span style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>{new Date(ev.startTime).toLocaleDateString('en', { month: 'short' })}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{fmt(ev.startTime)}</div>
                </div>
                <span className="badge" style={{ background: '#F1F5F9', color: 'var(--text3)', fontSize: 10 }}>{ev.eventType}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Schedule Event</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" name="title" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input className="form-input" name="start_time" type="datetime-local" required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input className="form-input" name="end_time" type="datetime-local" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Event Type</label>
                <select className="form-input" name="event_type">
                  {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Lead (optional)</label>
                <input
                  className="form-input"
                  placeholder="🔍 Lead search karo..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  style={{ marginBottom: 6 }}
                />
                <select className="form-input" name="lead_id">
                  <option value="">-- None --</option>
                  {leads
                    .filter((l) => !leadSearch || l.name.toLowerCase().includes(leadSearch.toLowerCase()))
                    .map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" name="description" rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
