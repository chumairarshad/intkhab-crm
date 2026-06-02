import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateInvoiceStatus, deleteInvoice } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { status } = await req.json();
  await updateInvoiceStatus(parseInt(params.id), status);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await deleteInvoice(parseInt(params.id));
  return NextResponse.json({ success: true });
}
