import { auth } from '@/lib/auth';
import { getUsers, getProperties, getLeads, getPasswordResetRequests } from '@/lib/db';
import { redirect } from 'next/navigation';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== 'admin') redirect('/dashboard');

  const [allUsers, allProperties, allLeads, resetRequests] = await Promise.all([
    getUsers(),
    getProperties(true, 0),
    getLeads(true, 0),
    getPasswordResetRequests(),
  ]);

  const users = allUsers.map((u) => ({
    id: u.id, name: u.name, email: u.email, role: u.role,
    createdAt: u.createdAt.toISOString(),
    propertiesCount: allProperties.filter((p) => p.agentId === u.id).length,
    leadsCount: allLeads.filter((l) => l.agentId === u.id).length,
  }));

  return <UsersClient users={users} currentUserId={user?.id} resetRequests={resetRequests} />;
}
