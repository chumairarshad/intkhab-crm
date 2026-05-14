import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { initDb } from '@/lib/db';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await initDb();
  const session = await auth();
  if (!session) redirect('/login');

  const user = session.user as any;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar userName={user.name || 'User'} userRole={user.role || 'agent'} />
      <div className="main">{children}</div>
    </div>
  );
}
