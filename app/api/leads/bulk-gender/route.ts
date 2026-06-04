import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { auth } from '@/lib/auth';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const rows: { name: string; gender: string }[] = body.rows || [];

    if (!rows.length) {
      return NextResponse.json({ updated: 0 });
    }

    let updated = 0;

    for (const row of rows) {
      const rawGender = (row.gender || '').toString().trim();
      let gender = '';
      if (/^m/i.test(rawGender)) gender = 'Male';
      else if (/^f/i.test(rawGender)) gender = 'Female';
      if (!gender) continue;

      const result = await sql`
        UPDATE leads SET gender = ${gender}
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(${row.name?.trim() || ''}))
      `;
      updated += result.length;
    }

    return NextResponse.json({ updated });
  } catch (err: any) {
    console.error('Bulk gender update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
