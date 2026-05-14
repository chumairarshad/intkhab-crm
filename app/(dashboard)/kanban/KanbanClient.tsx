'use client';
import { useState } from 'react';

interface Lead {
  id: number; name: string; email: string; phone: string;
  source: string; stage: string; budget: number; notes: string;
  agentId: number; propertyId: number | null; createdAt: string;
}

function formatPKR(n: number) {
  if (n >= 10000000) return `₨${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₨${(n / 100000).toFixed(1)}L`;
  return `₨${n.toLocaleString()}`;
}

const STAGES = ['New', 'Contacted', 'Viewing', 'Negotiating', 'Closed'];
const COLORS: Record<string, string> = {
  New: '#1A56DB', Contacted: '#0284C7', Viewing: '#D97706',
  Negotiating: '#EA580C', Closed: '#059669',
};

export default function KanbanClient({ leads: initial }: { leads: Lead[] }) {
  const [leads, setLeads] = useState(initial);
  const [dragging, setDragging] = useState<number | null>(null);

  const onDragStart = (id: number) => setDragging(id);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const onDrop = async (stage: string) => {
    if (dragging === null) return;
    const prev = leads.find((l) => l.id === dragging);
    if (!prev || prev.stage === stage) { setDragging(null); return; }
    setLeads(leads.map((l) => l.id === dragging ? { ...l, stage } : l));
    setDragging(null);
    await fetch(`/api/leads/${dragging}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Kanban Board</div>
          <div className="topbar-sub">Drag leads across pipeline stages</div>
        </div>
      </div>
      <div className="page-content">
        <div className="kanban-board">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage);
            return (
              <div
                key={stage}
                className="kanban-col"
                onDragOver={onDragOver}
                onDrop={() => onDrop(stage)}
              >
                <div className="kanban-col-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[stage] }}></div>
                    <span className="kanban-col-title">{stage}</span>
                  </div>
                  <span className="kanban-count">{stageLeads.length}</span>
                </div>
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="kanban-card"
                    draggable
                    onDragStart={() => onDragStart(lead.id)}
                    style={{ opacity: dragging === lead.id ? 0.5 : 1 }}
                  >
                    <div className="kanban-card-name">{lead.name}</div>
                    {lead.phone && (
                      <div className="kanban-card-info">
                        <i className="fas fa-phone" style={{ fontSize: 10 }}></i>
                        {lead.phone}
                      </div>
                    )}
                    <div className="kanban-card-info">
                      <i className="fas fa-rupee-sign" style={{ fontSize: 10 }}></i>
                      {formatPKR(lead.budget)}
                    </div>
                    <div className="kanban-card-info">
                      <i className="fas fa-tag" style={{ fontSize: 10 }}></i>
                      {lead.source}
                    </div>
                    {lead.phone && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                        <a
                          href={`tel:${lead.phone}`}
                          style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid #A7F3D0', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                        >
                          <i className="fas fa-phone" style={{ fontSize: 10 }}></i> Call
                        </a>
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                        >
                          <i className="fab fa-whatsapp" style={{ fontSize: 10 }}></i> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
