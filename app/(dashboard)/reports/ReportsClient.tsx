'use client';

interface Props {
  stats: { totalValue: string; soldCount: number; closedLeads: number; convRate: number };
  byType: { type: string; count: number; value: string; avg: string }[];
  stageData: { stage: string; count: number; pct: number }[];
  agentPerf: { name: string; leads: number; closed: number; properties: number }[];
  generatedAt: string;
}

export default function ReportsClient({ stats, byType, stageData, agentPerf, generatedAt }: Props) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .sidebar { display: none !important; }
          .main { margin-left: 0 !important; }
          .topbar { position: static !important; box-shadow: none !important; border: none !important; }
          .page-content { padding: 0 !important; }
          .card { break-inside: avoid; box-shadow: none !important; border: 1px solid #ddd !important; }
          body { background: white !important; }
          .grid-layout { display: grid !important; }
          .print-header { display: block !important; }
        }
        .print-header { display: none; }
      `}</style>

      <div className="topbar no-print" style={{ paddingLeft: 60 }}>
        <div>
          <div className="topbar-title">Reports</div>
          <div className="topbar-sub">Portfolio summary and performance metrics</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={handlePrint}>
            <i className="fas fa-file-pdf"></i> Export PDF
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Print Header */}
        <div className="print-header" style={{ marginBottom: 24, borderBottom: '2px solid #1A56DB', paddingBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0A1628' }}>🏠 Fill My Calendar</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Team Intkhab</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#64748B' }}>
              <div>Generated: {generatedAt}</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-layout grid-4" style={{ marginBottom: 22 }}>
          {[
            { label: 'Total Portfolio (PKR)', value: stats.totalValue, icon: 'rupee-sign', color: 'green' },
            { label: 'Properties Sold', value: stats.soldCount, icon: 'home', color: 'blue' },
            { label: 'Leads Closed', value: stats.closedLeads, icon: 'handshake', color: 'yellow' },
            { label: 'Conversion Rate', value: `${stats.convRate}%`, icon: 'percent', color: 'red' },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className={`stat-icon ${s.color} no-print`} style={{ marginBottom: 14 }}>
                <i className={`fas fa-${s.icon}`}></i>
              </div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid-layout grid-2">
          {/* Properties by Type */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><i className="fas fa-building" style={{ color: '#1A56DB', marginRight: 8 }}></i>Properties by Type</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Type</th><th>Count</th><th>Total Value</th><th>Avg Value</th></tr>
                </thead>
                <tbody>
                  {byType.map((r) => (
                    <tr key={r.type}>
                      <td><span className="badge badge-new">{r.type}</span></td>
                      <td style={{ fontWeight: 700 }}>{r.count}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{r.value}</td>
                      <td style={{ color: 'var(--text3)' }}>{r.avg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lead Stage Summary */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><i className="fas fa-users" style={{ color: '#059669', marginRight: 8 }}></i>Lead Summary by Stage</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Stage</th><th>Count</th><th>% of Total</th></tr>
                </thead>
                <tbody>
                  {stageData.map(({ stage, count, pct }) => (
                    <tr key={stage}>
                      <td><span className={`badge badge-${stage.toLowerCase()}`}>{stage}</span></td>
                      <td style={{ fontWeight: 700 }}>{count}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ background: '#F1F5F9', borderRadius: 20, height: 6, width: 60, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, background: 'var(--accent)', height: '100%', borderRadius: 20 }}></div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Agent Performance */}
          {agentPerf.length > 0 && (
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header">
                <span className="card-title"><i className="fas fa-chart-bar" style={{ color: '#D97706', marginRight: 8 }}></i>Agent Performance</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Agent</th><th>Total Leads</th><th>Closed Leads</th><th>Properties</th><th>Conv. Rate</th></tr>
                  </thead>
                  <tbody>
                    {agentPerf.map((a) => (
                      <tr key={a.name}>
                        <td style={{ fontWeight: 700 }}>{a.name}</td>
                        <td>{a.leads}</td>
                        <td style={{ color: 'var(--green)', fontWeight: 700 }}>{a.closed}</td>
                        <td>{a.properties}</td>
                        <td style={{ fontWeight: 700 }}>{a.leads ? Math.round((a.closed / a.leads) * 100) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Print Footer */}
        <div className="print-header" style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #ddd', fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
          Fill My Calendar — Team Intkhab — Confidential
        </div>
      </div>
    </>
  );
}
