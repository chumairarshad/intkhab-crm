import { NextRequest, NextResponse } from 'next/server';
import { getLeads, createLead } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');
  const leads = await getLeads(isAdmin, userId);
  return NextResponse.json(leads.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    activities: (l.activities || []).map((a) => ({ ...a, createdAt: new Date(a.createdAt).toISOString() })),
  })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  const body = await req.json();
  const lead = await createLead({
    name: body.name,
    email: body.email || '',
    phone: body.phone || '',
    source: body.source || 'Website',
    stage: (body.stage || 'New') as any,
    budget: parseFloat(body.budget) || 0,
    notes: body.notes || '',
    agentId: user?.role === 'admin' && body.agent_id && body.agent_id !== 'custom' ? parseInt(body.agent_id) : parseInt(user?.id || '0'),
    propertyId: body.property_id ? parseInt(body.property_id) : null,
    gender: body.gender || '',
    customContactName: body.customContactName || '',
    customContactPhone: body.customContactPhone || '',
    customContactAddress: body.customContactAddress || '',
  });
  return NextResponse.json({ ...lead, createdAt: lead.createdAt.toISOString(), activities: [] });
}
