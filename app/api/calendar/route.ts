import { NextRequest, NextResponse } from 'next/server';
import { createEvent } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  const body = await req.json();
  const event = await createEvent({
    title: body.title,
    description: body.description || '',
    startTime: new Date(body.start_time),
    endTime: new Date(body.end_time),
    leadId: body.lead_id ? parseInt(body.lead_id) : null,
    agentId: parseInt(user?.id || '0'),
    eventType: body.event_type || 'Call',
  });
  return NextResponse.json({ ...event, startTime: event.startTime.toISOString(), endTime: event.endTime.toISOString(), createdAt: event.createdAt.toISOString() });
}
