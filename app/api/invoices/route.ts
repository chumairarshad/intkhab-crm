import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getInvoices, createInvoice } from '@/lib/db';

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isAdmin = user.role === 'admin';
  const userId = parseInt(user.id || '0');
  const invoices = await getInvoices(isAdmin, userId);
  return NextResponse.json(invoices.map((inv) => ({
    ...inv,
    createdAt: inv.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { agentId, issueDate, dueDate, notes, items } = body;
  if (!items || !items.length) return NextResponse.json({ error: 'At least one item required' }, { status: 400 });
  // Agents can only create invoices for themselves
  const finalAgentId = user.role === 'admin' ? (agentId || parseInt(user.id)) : parseInt(user.id);
  const invoice = await createInvoice({ agentId: finalAgentId, issueDate, dueDate, notes: notes || '', items });
  return NextResponse.json({ ...invoice, createdAt: invoice.createdAt.toISOString() });
}
