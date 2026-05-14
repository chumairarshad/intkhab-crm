import { NextRequest, NextResponse } from 'next/server';
import { updateProperty, deleteProperty, setPropertyAgents, getPropertyAgents } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const prop = await updateProperty(parseInt(id), body);
  if (!prop) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Update multi-agent assignments if provided
  if (body.agent_ids !== undefined) {
    const agentIds: number[] = JSON.parse(body.agent_ids);
    await setPropertyAgents(parseInt(id), agentIds.length ? agentIds : [prop.agentId]);
    return NextResponse.json({ ...prop, createdAt: prop.createdAt.toISOString(), agentIds });
  }
  const agentIds = await getPropertyAgents(parseInt(id));
  return NextResponse.json({ ...prop, createdAt: prop.createdAt.toISOString(), agentIds: agentIds.length ? agentIds : [prop.agentId] });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteProperty(parseInt(id));
  return NextResponse.json({ success: true });
}
