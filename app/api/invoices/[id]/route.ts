import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateInvoiceStatus, deleteInvoice } from '@/lib/db';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const { status } = await req.json();
  await updateInvoiceStatus(parseInt(id), status);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await context.params;
  await deleteInvoice(parseInt(id));
  return NextResponse.json({ success: true });
}
