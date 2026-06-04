import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/db';
import { auth } from '@/lib/auth';

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
    const CHUNK_SIZE = 100;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);

      const statements = chunk
        .map((row) => {
          const rawGender = (row.gender || '').toString().trim();
          let gender = '';
          if (/^m/i.test(rawGender)) gender = 'Male';
          else if (/^f/i.test(rawGender)) gender = 'Female';
          if (!gender) return null;

          return {
            sql: `UPDATE leads SET gender = ? WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND (gender IS NULL OR gender = '')`,
            args: [gender, row.name?.trim() || ''],
          };
        })
        .filter(Boolean) as { sql: string; args: any[] }[];

      if (statements.length > 0) {
        await turso.batch(statements, 'write');
        updated += statements.length;
      }
    }

    return NextResponse.json({ updated });
  } catch (err: any) {
    console.error('Bulk gender update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
