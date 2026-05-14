import { NextRequest, NextResponse } from 'next/server';
import { getProperties, createProperty, setPropertyAgents, getPropertyAgentsBulk } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');
  const properties = await getProperties(isAdmin, userId);
  const ids = properties.map((p) => p.id);
  const agentsMap = await getPropertyAgentsBulk(ids);
  return NextResponse.json(properties.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), agentIds: agentsMap[p.id] || [p.agentId] })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  const body = await req.json();
  const primaryAgentId = user?.role === 'admin' && body.agent_id ? parseInt(body.agent_id) : parseInt(user?.id || '0');
  const prop = await createProperty({
    title: body.title,
    address: body.address,
    price: parseFloat(body.price) || 0,
    propertyType: body.property_type || 'House',
    bedrooms: parseInt(body.bedrooms) || 0,
    bathrooms: parseInt(body.bathrooms) || 0,
    area: parseFloat(body.area) || 0,
    status: (body.status || 'Available') as any,
    description: body.description || '',
    agentId: primaryAgentId,
  });
  // Save multi-agent assignments
  const agentIds: number[] = body.agent_ids ? JSON.parse(body.agent_ids) : [primaryAgentId];
  await setPropertyAgents(prop.id, agentIds.length ? agentIds : [primaryAgentId]);
  return NextResponse.json({ ...prop, createdAt: prop.createdAt.toISOString(), agentIds });
}
