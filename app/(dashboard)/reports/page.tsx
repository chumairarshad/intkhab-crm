import { auth } from '@/lib/auth';
import { getProperties, getLeads, getUsers, formatPKR } from '@/lib/db';
import ReportsClient from './ReportsClient';

export default async function ReportsPage() {
  const session = await auth();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');

  const [properties, leads, allUsers] = await Promise.all([
    getProperties(isAdmin, userId),
    getLeads(isAdmin, userId),
    getUsers(),
  ]);
  const agents = allUsers.filter((u) => u.role === 'agent').map((u) => ({ id: u.id, name: u.name }));

  const totalValue = properties.reduce((s, p) => s + p.price, 0);
  const soldProps = properties.filter((p) => p.status === 'Sold');
  const closedLeads = leads.filter((l) => l.stage === 'Closed');
  const convRate = leads.length ? Math.round((closedLeads.length / leads.length) * 100) : 0;

  const byType: Record<string, { count: number; value: number }> = {};
  properties.forEach((p) => {
    if (!byType[p.propertyType]) byType[p.propertyType] = { count: 0, value: 0 };
    byType[p.propertyType].count++;
    byType[p.propertyType].value += p.price;
  });

  const stageData = ['New', 'Contacted', 'Viewing', 'Negotiating', 'Closed'].map((stage) => ({
    stage,
    count: leads.filter((l) => l.stage === stage).length,
    pct: leads.length ? Math.round((leads.filter((l) => l.stage === stage).length / leads.length) * 100) : 0,
  }));

  const agentPerf = agents.map((a) => {
    const aLeads = leads.filter((l) => l.agentId === a.id);
    const aProps = properties.filter((p) => p.agentId === a.id);
    return { name: a.name, leads: aLeads.length, closed: aLeads.filter((l) => l.stage === 'Closed').length, properties: aProps.length };
  });

  return (
    <ReportsClient
      stats={{ totalValue: formatPKR(totalValue), soldCount: soldProps.length, closedLeads: closedLeads.length, convRate }}
      byType={Object.entries(byType).map(([type, d]) => ({ type, count: d.count, value: formatPKR(d.value), avg: formatPKR(d.value / d.count) }))}
      stageData={stageData}
      agentPerf={agentPerf}
      generatedAt={new Date().toLocaleString()}
    />
  );
}
