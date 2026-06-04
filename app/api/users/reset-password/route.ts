import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateUserPassword, getUserByEmail } from '@/lib/db';

// Admin resets any user's password
export async function POST(req: NextRequest) {
  const session = await auth();
  const currentUser = session?.user as any;
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only admin can reset passwords.' }, { status: 403 });
  }
  const { userId, newPassword } = await req.json();
  if (!userId || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'User ID and a password of at least 6 characters are required.' }, { status: 400 });
  }
  await updateUserPassword(parseInt(userId), newPassword);
  return NextResponse.json({ success: true });
}
