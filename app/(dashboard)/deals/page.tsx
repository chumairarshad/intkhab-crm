import { auth } from '@/lib/auth';
import { getDealActivities, getLeads } from '@/lib/db';
import DealsClient from './DealsClient';

export default async function DealsPage() {
  const session = await auth();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');
  const [deals, leads] = await Promise.all([
    getDealActivities(isAdmin, userId),
    getLeads(isAdmin, userId),
  ]);
  return (
    <DealsClient
      initial={deals.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))}
      leads={leads.map((l) => ({ id: l.id, name: l.name, phone: l.phone, agentId: l.agentId }))}
      isAdmin={isAdmin}
    />
  );
}
