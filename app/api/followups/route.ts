import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFollowUps, deleteActivity } from '@/lib/db';

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');
  const followups = await getFollowUps(isAdmin, userId);
  return NextResponse.json(followups.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })));
}

export async function DELETE(req: Request) {
  const { activityId } = await req.json();
  await deleteActivity(parseInt(activityId));
  return Response.json({ success: true });
}
