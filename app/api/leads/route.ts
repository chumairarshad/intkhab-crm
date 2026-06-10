import { NextRequest, NextResponse } from 'next/server';
import { getLeads, getLeadsCount, createLead } from '@/lib/db';
import { auth } from '@/lib/auth';
import { getMobileUser } from '@/lib/mobile-auth';

async function getUser(req: NextRequest) {
  const mobileUser = getMobileUser(req);
  if (mobileUser) return mobileUser;
  const session = await auth();
  return session?.user as any;
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isAdmin = user?.role === 'admin';
  const userId = parseInt(user?.id || '0');
  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get('offset') || '0');
  const limit = parseInt(searchParams.get('limit') || '500');
  const [leads, total] = await Promise.all([
    getLeads(isAdmin, userId, limit, offset),
    getLeadsCount(isAdmin, userId),
  ]);
  return NextResponse.json({
    leads: leads.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      activities: (l.activities || []).map((a) => ({ ...a, createdAt: new Date(a.createdAt).toISOString() })),
    })),
    total,
    offset,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
