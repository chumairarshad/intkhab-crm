import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { auth } from '@/lib/auth';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    const agentId = parseInt(user?.id || '0');

    const body = await req.json();
    const rows: any[] = body.rows || [];

    const valid = rows.filter((r) => r.name?.trim());
    if (!valid.length) {
      return NextResponse.json({ count: 0, leads: [] });
    }

    let totalInserted = 0;

    for (const row of valid) {
      const rawGender = (row.gender || row.Gender || row.GENDER || '').toString().trim();
      let gender = '';
      if (/^m/i.test(rawGender)) gender = 'Male';
      else if (/^f/i.test(rawGender)) gender = 'Female';

      await sql`
        INSERT INTO leads (name, email, phone, source, stage, budget, notes, "agentId", "propertyId", gender)
        VALUES (
          ${row.name?.trim() || ''},
          ${row.email?.trim() || ''},
          ${row.phone?.trim() || ''},
          ${row.source || 'Website'},
          ${['New','Contacted','Viewing','Negotiating','Closed'].includes(row.stage) ? row.stage : 'New'},
          ${parseFloat(row.budget) || 0},
          ${row.notes?.trim() || ''},
          ${agentId},
          ${null},
          ${gender}
        )
      `;
      totalInserted++;
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
