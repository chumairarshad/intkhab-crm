import { auth } from '@/lib/auth';
import { getFollowUps } from '@/lib/db';
import FollowupsClient from './FollowupsClient';

export default async function FollowupsPage() {
  const session = await auth();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');
  const followups = await getFollowUps(isAdmin, userId);
  return <FollowupsClient initial={followups.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))} />;
}
