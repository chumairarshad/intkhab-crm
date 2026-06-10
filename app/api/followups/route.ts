import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMobileUser } from '@/lib/mobile-auth';
import { getFollowUps, deleteActivity } from '@/lib/db';

async function getUser(req: NextRequest) {
  const mobileUser = getMobileUser(req);
  if (mobileUser) return mobileUser;
  const session = await auth();
  return session?.user as any;
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');
  const followups = await getFollowUps(isAdmin, userId);
  return NextResponse.json(followups.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })));
}

export async function DELETE(req: NextRequest) {
  const { activityId } = await req.json();
  await deleteActivity(parseInt(activityId));
  return NextResponse.json({ success: true });
}
