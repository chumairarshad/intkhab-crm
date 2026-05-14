import { NextRequest, NextResponse } from 'next/server';
import { updateLead, deleteLead } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const lead = await updateLead(parseInt(id), body);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    activities: (lead.activities || []).map((a) => ({ ...a, createdAt: new Date(a.createdAt).toISOString() })),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteLead(parseInt(id));
  return NextResponse.json({ success: true });
}
