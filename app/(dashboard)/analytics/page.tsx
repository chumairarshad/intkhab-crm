import { auth } from '@/lib/auth';
import { getProperties, getLeads, formatPKR } from '@/lib/db';

export default async function AnalyticsPage() {
  const session = await auth();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');

  const [properties, leads] = await Promise.all([
    getProperties(isAdmin, userId),
    getLeads(isAdmin, userId),
  ]);

  const stages = ['New', 'Contacted', 'Viewing', 'Negotiating', 'Closed'];
  const stageCounts = stages.map((s) => ({ stage: s, count: leads.filter((l) => l.stage === s).length }));

  const sources: Record<string, number> = {};
  leads.forEach((l) => { sources[l.source || 'Unknown'] = (sources[l.source || 'Unknown'] || 0) + 1; });

  const statuses: Record<string, number> = {};
  properties.forEach((p) => { statuses[p.status] = (statuses[p.status] || 0) + 1; });

  const totalValue = properties.reduce((s, p) => s + p.price, 0);
  const avgPrice = properties.length ? totalValue / properties.length : 0;

  const stageColors: Record<string, string> = {
    New: '#1A56DB', Contacted: '#0284C7', Viewing: '#D97706',
    Negotiating: '#EA580C', Closed: '#059669',
  };

  const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Analytics</div>
          <div className="topbar-sub">Portfolio performance overview</div>
        </div>
      </div>
      <div className="page-content">
        <div className="grid-layout grid-4" style={{ marginBottom: 22 }}>
          {[
            { label: 'Total Properties', value: properties.length, icon: 'building', color: 'blue' },
            { label: 'Portfolio Value (PKR)', value: formatPKR(totalValue), icon: 'rupee-sign', color: 'green' },
            { label: 'Total Leads', value: leads.length, icon: 'users', color: 'yellow' },
            { label: 'Avg Property Price', value: formatPKR(avgPrice), icon: 'chart-line', color: 'red' },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className={`stat-icon ${s.color}`} style={{ marginBottom: 14 }}>
                <i className={`fas fa-${s.icon}`}></i>
              </div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid-layout grid-2" style={{ marginBottom: 22 }}>
          {/* Lead Pipeline Chart */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><i className="fas fa-funnel-dollar" style={{ color: '#1A56DB', marginRight: 8 }}></i>Lead Pipeline</span>
            </div>
            {stageCounts.map(({ stage, count }) => (
              <div key={stage} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{stage}</span>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{count}</span>
                </div>
                <div style={{ background: '#F1F5F9', borderRadius: 20, height: 10, overflow: 'hidden' }}>
                  <div style={{ width: `${(count / maxCount) * 100}%`, background: stageColors[stage], height: '100%', borderRadius: 20, transition: 'width 0.5s ease' }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Lead Sources */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><i className="fas fa-chart-pie" style={{ color: '#059669', marginRight: 8 }}></i>Lead Sources</span>
            </div>
            {Object.entries(sources).map(([source, count]) => (
              <div key={source} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{source}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ background: '#F1F5F9', borderRadius: 20, height: 8, width: 80, overflow: 'hidden' }}>
                    <div style={{ width: `${(count / leads.length) * 100}%`, background: '#1A56DB', height: '100%', borderRadius: 20 }}></div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', minWidth: 20, textAlign: 'right' }}>{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Property Status Breakdown */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><i className="fas fa-home" style={{ color: '#1A56DB', marginRight: 8 }}></i>Property Status</span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(statuses).map(([status, count]) => (
              <div key={status} style={{ flex: 1, minWidth: 140, background: '#F8FAFC', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>{count}</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>{status}</div>
                <div style={{ marginTop: 10, background: '#E2E8F0', borderRadius: 20, height: 6 }}>
                  <div style={{ width: `${(count / properties.length) * 100}%`, background: status === 'Available' ? '#059669' : status === 'Sold' ? '#DC2626' : '#D97706', height: '100%', borderRadius: 20 }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
