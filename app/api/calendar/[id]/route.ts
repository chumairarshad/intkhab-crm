import { NextRequest, NextResponse } from 'next/server';
import { deleteEvent } from '@/lib/db';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteEvent(parseInt(id));
  return NextResponse.json({ success: true });
}
