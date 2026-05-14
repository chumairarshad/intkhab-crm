import { auth } from '@/lib/auth';
import { getLeads } from '@/lib/db';
import KanbanClient from './KanbanClient';

export default async function KanbanPage() {
  const session = await auth();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');
  const leads = await getLeads(isAdmin, userId);
  return <KanbanClient leads={leads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString(), activities: [] }))} />;
}
