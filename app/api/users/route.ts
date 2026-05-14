import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser, deleteUser, getUserByEmail } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET() {
  const users = await getUsers();
  return NextResponse.json(users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  if (!body.name || !body.email || !body.password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const existing = await getUserByEmail(body.email);
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
  const newUser = await createUser(body.name, body.email, body.password, body.role || 'agent');
  return NextResponse.json({ ...newUser, createdAt: newUser.createdAt.toISOString() });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const currentUser = session?.user as any;
  if (currentUser?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '');
  if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  if (String(currentUser?.id) === String(id)) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  await deleteUser(id);
  return NextResponse.json({ success: true });
}
