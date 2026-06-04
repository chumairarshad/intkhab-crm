import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createPasswordResetRequest,
  getPasswordResetRequests,
  resolvePasswordResetRequest,
  dismissPasswordResetRequest,
  getUserByEmail,
} from '@/lib/db';

// POST — Agent submits forgot password request (no auth required)
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  try {
    await createPasswordResetRequest(email);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Something went wrong.' }, { status: 400 });
  }
}

// GET — Admin fetches all pending requests
export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const requests = await getPasswordResetRequests();
  return NextResponse.json(requests);
}

// PATCH — Admin resolves or dismisses a request
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, action, email, newPassword } = await req.json();
  if (!id || !action) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });

  if (action === 'resolve') {
    if (!newPassword || newPassword.length < 6)
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    const targetUser = await getUserByEmail(email);
    if (!targetUser) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    await resolvePasswordResetRequest(id, targetUser.id, newPassword);
    return NextResponse.json({ success: true });
  }

  if (action === 'dismiss') {
    await dismissPasswordResetRequest(id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
}
