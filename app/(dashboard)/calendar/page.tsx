import { auth } from '@/lib/auth';
import { getEvents, getLeads } from '@/lib/db';
import CalendarClient from './CalendarClient';

export default async function CalendarPage() {
  const session = await auth();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');

  const [events, leads] = await Promise.all([
    getEvents(isAdmin, userId),
    getLeads(isAdmin, userId),
  ]);

  return (
    <CalendarClient
      events={events.map((e) => ({ ...e, startTime: e.startTime.toISOString(), endTime: e.endTime.toISOString(), createdAt: e.createdAt.toISOString() }))}
      leads={leads.map((l) => ({ id: l.id, name: l.name }))}
      currentUserId={userId}
    />
  );
}
