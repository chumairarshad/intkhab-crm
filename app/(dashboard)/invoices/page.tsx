import { auth } from '@/lib/auth';
import { getInvoices, getAgents } from '@/lib/db';
import InvoicesClient from './InvoicesClient';

export default async function InvoicesPage() {
  const session = await auth();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');
  const [invoices, agents] = await Promise.all([
    getInvoices(isAdmin, userId),
    getAgents(),
  ]);
  return (
    <InvoicesClient
      initial={invoices.map((inv) => ({ ...inv, createdAt: inv.createdAt.toISOString() }))}
      agents={agents}
      isAdmin={isAdmin}
      currentAgentId={userId}
      currentAgentName={user?.name || ''}
    />
  );
}
