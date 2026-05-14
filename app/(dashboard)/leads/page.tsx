import { auth } from '@/lib/auth';
import { getLeads, getUsers, getProperties } from '@/lib/db';
import LeadsClient from './LeadsClient';

export default async function LeadsPage() {
  const session = await auth();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');

  const [leads, allUsers, allProperties] = await Promise.all([
    getLeads(isAdmin, userId),
    getUsers(),
    getProperties(true, 0),
  ]);

  return (
    <LeadsClient
      leads={leads.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
        activities: (l.activities || []).map((a) => ({ ...a, createdAt: new Date(a.createdAt).toISOString() })),
      }))}
      agents={allUsers.filter((u) => u.role === 'agent').map((u) => ({ id: u.id, name: u.name }))}
      properties={allProperties.map((p) => ({ id: p.id, title: p.title }))}
      isAdmin={isAdmin}
    />
  );
}
