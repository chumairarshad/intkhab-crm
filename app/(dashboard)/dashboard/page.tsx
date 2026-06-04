import { auth } from '@/lib/auth';
import { getProperties, getLeads, getEvents, formatPKR, getAgents, getLeadsGenderStats } from '@/lib/db';
import Link from 'next/link';
import DailyBriefing from './DailyBriefing';

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');

  const [properties, recentLeads, allEvents, leadsStats, allLeadsStats, agentList] = await Promise.all([
    getProperties(isAdmin, userId),
    getLeads(isAdmin, userId, 5),
    getEvents(isAdmin, userId),
    getLeadsGenderStats(isAdmin, userId),
    isAdmin ? getLeadsGenderStats(true, 0) : Promise.resolve({ total: 0, male: 0, female: 0, stageCounts: {} }),
    isAdmin ? getAgents() : Promise.resolve([]),
  ]);

  // For agents progress we still need full leads (only 500 but enough for progress table)
  const allLeadsForAgents = isAdmin ? await getLeads(true, 0, 50000) : [];

  const agentsProgress = isAdmin ? agentList.map((a: any) => ({
    id: a.id, name: a.name,
    total: allLeadsForAgents.filter((l: any) => l.agentId === a.id).length,
    called: allLeadsForAgents.filter((l: any) => l.agentId === a.id && (l.activities||[]).length > 0).length,
    closed: allLeadsForAgents.filter((l: any) => l.agentId === a.id && l.stage === 'Closed').length,
    negotiating: allLeadsForAgents.filter((l: any) => l.agentId === a.id && l.stage === 'Negotiating').length,
  })) : [];

  const totalLeads = leadsStats.total;
  const maleLeads = leadsStats.male;
  const femaleLeads = leadsStats.female;
  const stageCounts = leadsStats.stageCounts;

  const now = new Date();
  const events = allEvents
    .filter((e) => e.startTime > now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, 5);

  const totalValue = properties.reduce((s, p) => s + p.price, 0);
  const available = properties.filter((p) => p.status === 'Available').length;
  const sold = properties.filter((p) => p.status === 'Sold').length;

  // Daily Brief data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = allEvents
    .filter((e) => e.startTime >= today && e.startTime < tomorrow)
    .map((e) => ({
      id: e.id, title: e.title, eventType: e.eventType,
      time: e.startTime.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
    }));

  const untouchedLeads = recentLeads
    .filter((l) => l.stage === 'New' || l.stage === 'Contacted')
    .slice(0, 10)
    .map((l) => ({ id: l.id, name: l.name, stage: l.stage, phone: l.phone }));

  const hotLeads = recentLeads
    .filter((l) => l.stage === 'Negotiating')
    .map((l) => ({ id: l.id, name: l.name, phone: l.phone }));

  const briefData = {
    userName: user?.name || 'Agent',
    totalLeads: totalLeads,
    newLeads: stageCounts['New'] || 0,
    negotiating: stageCounts['Negotiating'] || 0,
    closed: stageCounts['Closed'] || 0,
    todayEvents,
    untouchedLeads,
    hotLeads,
  };

  const stages: [string, string][] = [
    ['New', '#1A56DB'], ['Contacted', '#0284C7'], ['Viewing', '#D97706'],
    ['Negotiating', '#EA580C'], ['Closed', '#059669'], ['Lost', '#6B7280'],
  ];

  return (
    <>
      <DailyBriefing data={briefData} />
      <div className="topbar">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-sub">Welcome back, {user?.name} 👋</div>
        </div>
      </div>
      <div className="page-content">
        <div className="grid-layout grid-4" style={{ marginBottom: 22 }}>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="stat-icon blue"><i className="fas fa-building"></i></div>
            </div>
            <div className="stat-value">{properties.length}</div>
            <div className="stat-label">Total Properties</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>{available} available · {sold} sold</div>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="stat-icon green"><i className="fas fa-rupee-sign"></i></div>
            </div>
            <div className="stat-value">{formatPKR(totalValue)}</div>
            <div className="stat-label">Portfolio Value (PKR)</div>
            <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 8 }}>↑ Total market value</div>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="stat-icon yellow"><i className="fas fa-users"></i></div>
            </div>
            <div className="stat-value">{totalLeads}</div>
            <div className="stat-label">Total Leads</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>{stageCounts['New'] || 0} new leads</div>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="stat-icon red"><i className="fas fa-handshake"></i></div>
            </div>
            <div className="stat-value">{stageCounts['Closed'] || 0}</div>
            <div className="stat-label">Closed Deals</div>
            <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 8 }}>↑ {stageCounts['Negotiating'] || 0} negotiating</div>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="stat-icon blue"><i className="fas fa-male"></i></div>
            </div>
            <div className="stat-value">{maleLeads}</div>
            <div className="stat-label">Male Leads</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>{totalLeads > 0 ? Math.round((maleLeads / totalLeads) * 100) : 0}% of total</div>
          </div>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="stat-icon red"><i className="fas fa-female"></i></div>
            </div>
            <div className="stat-value">{femaleLeads}</div>
            <div className="stat-label">Female Leads</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>{totalLeads > 0 ? Math.round((femaleLeads / totalLeads) * 100) : 0}% of total</div>
          </div>
        </div>

        <div className="grid-layout grid-2" style={{ marginBottom: 22 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title"><i className="fas fa-filter" style={{ color: '#1A56DB', marginRight: 8 }}></i>Lead Pipeline</span>
              <Link href="/kanban" className="btn btn-outline btn-sm">View Kanban</Link>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, background: '#D0DEF5', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fas fa-male" style={{ fontSize: 20, color: 'var(--accent)' }}></i>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{maleLeads}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Male · {totalLeads > 0 ? Math.round((maleLeads / totalLeads) * 100) : 0}%</div>
                </div>
              </div>
              <div style={{ flex: 1, background: '#FFE4EC', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fas fa-female" style={{ fontSize: 20, color: '#C1121F' }}></i>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#C1121F', lineHeight: 1 }}>{femaleLeads}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Female · {totalLeads > 0 ? Math.round((femaleLeads / totalLeads) * 100) : 0}%</div>
                </div>
              </div>
            </div>
            {stages.map(([stage, color]) => {
              const count = stageCounts[stage] || 0;
              const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
              return (
                <div key={stage} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{stage}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ background: '#F1F5F9', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 20 }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title"><i className="fas fa-calendar-check" style={{ color: '#059669', marginRight: 8 }}></i>Upcoming Events</span>
              <Link href="/calendar" className="btn btn-outline btn-sm">View All</Link>
            </div>
            {events.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 20px' }}>
                <i className="fas fa-calendar" style={{ fontSize: 32, opacity: 0.3 }}></i>
                <p style={{ marginTop: 10, fontSize: 13 }}>No upcoming events</p>
                <Link href="/calendar" className="btn btn-primary btn-sm" style={{ marginTop: 12, display: 'inline-flex' }}>Schedule a Call</Link>
              </div>
            ) : events.map((event) => (
              <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ width: 44, height: 44, background: '#EFF6FF', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#1A56DB', lineHeight: 1 }}>{event.startTime.getDate()}</span>
                  <span style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>{event.startTime.toLocaleDateString('en', { month: 'short' })}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    <i className="fas fa-clock" style={{ marginRight: 4 }}></i>
                    {event.startTime.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span className="badge badge-new" style={{ fontSize: 10 }}>{event.eventType}</span>
              </div>
            ))}
          </div>
        </div>

        {isAdmin && agentsProgress.length > 0 && (
          <div className="card" style={{ marginBottom: 22 }}>
            <div className="card-header">
              <span className="card-title"><i className="fas fa-users-cog" style={{ color: '#1A56DB', marginRight: 8 }}></i>Agents Progress Report</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th style={{ textAlign: 'center' }}>Total Leads</th>
                    <th style={{ textAlign: 'center' }}>Contacted</th>
                    <th style={{ textAlign: 'center' }}>Negotiating</th>
                    <th style={{ textAlign: 'center' }}>Closed</th>
                    <th style={{ textAlign: 'center' }}>Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {agentsProgress.map((a: any) => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{a.name[0]}</div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{a.total}</td>
                      <td style={{ textAlign: 'center' }}><span style={{ color: '#0284C7', fontWeight: 600 }}>{a.called}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ color: '#EA580C', fontWeight: 600 }}>{a.negotiating}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ background: '#DCFCE7', color: '#059669', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{a.closed}</span></td>
                      <td style={{ minWidth: 140 }}>
                        <div style={{ background: 'var(--border)', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                          <div style={{ width: a.total > 0 ? Math.round((a.closed/a.total)*100)+'%' : '0%', background: '#059669', height: '100%', borderRadius: 20 }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, textAlign: 'right' }}>
                          {a.total > 0 ? Math.round((a.closed/a.total)*100) : 0}% closed
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isAdmin && agentsProgress.length > 0 && (
          <div className="card" style={{ marginBottom: 22 }}>
            <div className="card-header">
              <span className="card-title"><i className="fas fa-users-cog" style={{ color: '#1A56DB', marginRight: 8 }}></i>Agents Progress Report</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th style={{ textAlign: 'center' }}>Total Leads</th>
                    <th style={{ textAlign: 'center' }}>Contacted</th>
                    <th style={{ textAlign: 'center' }}>Negotiating</th>
                    <th style={{ textAlign: 'center' }}>Closed</th>
                    <th style={{ textAlign: 'center' }}>Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {agentsProgress.map((a: any) => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{a.name[0]}</div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{a.total}</td>
                      <td style={{ textAlign: 'center' }}><span style={{ color: '#0284C7', fontWeight: 600 }}>{a.called}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ color: '#EA580C', fontWeight: 600 }}>{a.negotiating}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ background: '#DCFCE7', color: '#059669', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{a.closed}</span></td>
                      <td style={{ minWidth: 140 }}>
                        <div style={{ background: 'var(--border)', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                          <div style={{ width: a.total > 0 ? Math.round((a.closed/a.total)*100)+'%' : '0%', background: '#059669', height: '100%', borderRadius: 20 }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, textAlign: 'right' }}>
                          {a.total > 0 ? Math.round((a.closed/a.total)*100) : 0}% closed
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isAdmin && agentsProgress.length > 0 && (
          <div className="card" style={{ marginBottom: 22 }}>
            <div className="card-header">
              <span className="card-title"><i className="fas fa-users-cog" style={{ color: '#1A56DB', marginRight: 8 }}></i>Agents Progress Report</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th style={{ textAlign: 'center' }}>Total Leads</th>
                    <th style={{ textAlign: 'center' }}>Contacted</th>
                    <th style={{ textAlign: 'center' }}>Negotiating</th>
                    <th style={{ textAlign: 'center' }}>Closed</th>
                    <th style={{ textAlign: 'center' }}>Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {agentsProgress.map((a: any) => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{a.name[0]}</div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{a.total}</td>
                      <td style={{ textAlign: 'center' }}><span style={{ color: '#0284C7', fontWeight: 600 }}>{a.called}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ color: '#EA580C', fontWeight: 600 }}>{a.negotiating}</span></td>
                      <td style={{ textAlign: 'center' }}><span style={{ background: '#DCFCE7', color: '#059669', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{a.closed}</span></td>
                      <td style={{ minWidth: 140 }}>
                        <div style={{ background: 'var(--border)', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                          <div style={{ width: a.total > 0 ? Math.round((a.closed/a.total)*100)+'%' : '0%', background: '#059669', height: '100%', borderRadius: 20 }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, textAlign: 'right' }}>
                          {a.total > 0 ? Math.round((a.closed/a.total)*100) : 0}% closed
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid-layout grid-2">
          <div className="card">
            <div className="card-header">
              <span className="card-title"><i className="fas fa-building" style={{ color: '#1A56DB', marginRight: 8 }}></i>Recent Properties</span>
              <Link href="/properties" className="btn btn-outline btn-sm">View All</Link>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Property</th><th>Price (PKR)</th><th>Status</th></tr></thead>
                <tbody>
                  {properties.slice(0, 5).map((p) => (
                    <tr key={p.id}>
                      <td><div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.propertyType}</div></td>
                      <td style={{ fontWeight: 700 }}>{formatPKR(p.price)}</td>
                      <td><span className={`badge badge-${p.status === 'Available' ? 'available' : p.status === 'Sold' ? 'sold' : 'offer'}`}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title"><i className="fas fa-user-tie" style={{ color: '#1A56DB', marginRight: 8 }}></i>Recent Leads</span>
              <Link href="/leads" className="btn btn-outline btn-sm">View All</Link>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Lead</th><th>Budget (PKR)</th><th>Stage</th></tr></thead>
                <tbody>
                  {recentLeads.slice(0, 5).map((l) => (
                    <tr key={l.id}>
                      <td><div style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>{l.source}</div></td>
                      <td style={{ fontWeight: 700 }}>{formatPKR(l.budget)}</td>
                      <td><span className={`badge badge-${l.stage.toLowerCase().replace(' ', '-')}`}>{l.stage}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
