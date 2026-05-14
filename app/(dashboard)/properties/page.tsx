import { auth } from '@/lib/auth';
import { getProperties, getUsers, formatPKR } from '@/lib/db';
import PropertiesClient from './PropertiesClient';

export default async function PropertiesPage() {
  const session = await auth();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');

  const [properties, allUsers] = await Promise.all([
    getProperties(isAdmin, userId),
    getUsers(),
  ]);
  const agents = allUsers.filter((u) => u.role === 'agent').map((u) => ({ id: u.id, name: u.name }));

  return (
    <PropertiesClient
      properties={properties.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), agentIds: (p as any).agentIds ?? [p.agentId] }))}
      agents={agents}
      isAdmin={isAdmin}
      currentUserId={userId}
    />
  );
}
