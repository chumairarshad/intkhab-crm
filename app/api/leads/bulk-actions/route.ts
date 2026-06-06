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
  const { action, ids, agentId } = body as { action: string; ids?: number[]; agentId?: number };

  // ── Count by date (for progress UI) ──────────────────────────
  if (action === 'count-by-date') {
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    const { date } = body as { date: string };
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
    const result = await sql`SELECT COUNT(*)::int as count FROM leads WHERE DATE("createdAt") = ${date}::date`;
    return NextResponse.json({ count: Number(result[0].count) });
  }

  // ── Delete batch by date (called multiple times for progress) ─
  if (action === 'delete-batch-by-date') {
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    const { date, batchSize } = body as { date: string; batchSize: number };
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
    const batch = batchSize || 200;
    // Get IDs for this batch
    const toDelete = await sql`SELECT id FROM leads WHERE DATE("createdAt") = ${date}::date LIMIT ${batch}`;
    if (!toDelete.length) return NextResponse.json({ success: true, deleted: 0, remaining: 0 });
    const batchIds = toDelete.map((r: any) => Number(r.id));
    await sql`DELETE FROM lead_activities WHERE "leadId" = ANY(${batchIds})`;
    await sql`DELETE FROM leads WHERE id = ANY(${batchIds})`;
    const remaining = await sql`SELECT COUNT(*)::int as count FROM leads WHERE DATE("createdAt") = ${date}::date`;
    return NextResponse.json({ success: true, deleted: batchIds.length, remaining: Number(remaining[0].count) });
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 });
  }

  if (action === 'delete') {
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

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
