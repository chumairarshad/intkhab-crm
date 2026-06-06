import { NextRequest, NextResponse } from 'next/server';
import { deleteLead, updateLead } from '@/lib/db';
import { auth } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, ids, agentId } = body as { action: string; ids: number[]; agentId?: number };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 });
  }

  if (action === 'delete') {
    // Only admins can bulk delete, or agents can delete their own leads
    for (const id of ids) {
      await deleteLead(id);
    }
    return NextResponse.json({ success: true, count: ids.length });
  }

  if (action === 'assign') {
    if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });
    const updated = [];
    for (const id of ids) {
      const lead = await updateLead(id, { agent_id: agentId });
      if (lead) updated.push({ ...lead, createdAt: lead.createdAt.toISOString(), activities: (lead.activities || []).map((a) => ({ ...a, createdAt: new Date(a.createdAt).toISOString() })) });
    }
    return NextResponse.json({ success: true, count: updated.length, leads: updated });
  }

  if (action === 'unassign') {
    let count = 0;
    for (const id of ids) {
      const lead = await updateLead(id, { agent_id: null });
      if (lead) count++;
    }
    return NextResponse.json({ success: true, count });
  }

  if (action === 'delete-by-date') {
    // Admin only
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    const { date } = body as { date: string }; // expects 'YYYY-MM-DD'
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
    // Delete activities first, then leads
    await sql`DELETE FROM lead_activities WHERE "leadId" IN (SELECT id FROM leads WHERE DATE("createdAt") = ${date}::date)`;
    const result = await sql`DELETE FROM leads WHERE DATE("createdAt") = ${date}::date RETURNING id`;
    return NextResponse.json({ success: true, count: result.length, date });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
