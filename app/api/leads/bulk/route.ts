import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    const agentId = parseInt(user?.id || '0');

    const body = await req.json();
    const rows: any[] = body.rows || [];

    // Filter valid rows (must have name)
    const valid = rows.filter((r) => r.name?.trim());
    if (!valid.length) {
      return NextResponse.json({ count: 0, leads: [] });
    }

    const now = new Date().toISOString();
    const CHUNK_SIZE = 100;
    let totalInserted = 0;

    // Process in chunks of 100 for speed
    for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
      const chunk = valid.slice(i, i + CHUNK_SIZE);

      // Build batch statements — 1 DB roundtrip per 100 leads!
      const statements = chunk.map((row) => {
        // Normalize gender — accept Male/Female/M/F/male/female/MALE/FEMALE
        const rawGender = (row.gender || row.Gender || row.GENDER || '').toString().trim();
        let gender = '';
        if (/^m/i.test(rawGender)) gender = 'Male';
        else if (/^f/i.test(rawGender)) gender = 'Female';

        return {
          sql: `INSERT INTO leads (name, email, phone, source, stage, budget, notes, agentId, propertyId, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
          args: [
            row.name?.trim() || '',
            row.email?.trim() || '',
            row.phone?.trim() || '',
            row.source || 'Website',
            ['New', 'Contacted', 'Viewing', 'Negotiating', 'Closed'].includes(row.stage)
              ? row.stage
              : 'New',
            parseFloat(row.budget) || 0,
            row.notes?.trim() || '',
            agentId,
            gender,
          ],
        };
      });

      // Execute all 100 inserts in ONE roundtrip
      await turso.batch(statements, 'write');
      totalInserted += chunk.length;
    }

    return NextResponse.json({
      count: totalInserted,
      leads: [],
      message: `✅ ${totalInserted} leads imported successfully!`,
    });

  } catch (err: any) {
    console.error('Bulk import error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
