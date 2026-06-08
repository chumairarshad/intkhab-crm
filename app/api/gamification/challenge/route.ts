import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTodayChallenge, getAgentStreak, updateTodayChallenge } from '@/lib/db';

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  const agentId = parseInt(user?.id || '0');
  if (!agentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [challenge, streak] = await Promise.all([
    updateTodayChallenge(agentId),
    getAgentStreak(agentId),
  ]);

  return NextResponse.json({
    callsDone: Number(challenge.callsDone || 0),
    callsTarget: Number(challenge.callsTarget || 10),
    closedDone: Number(challenge.closedDone || 0),
    closedTarget: Number(challenge.closedTarget || 2),
    whatsappDone: Number(challenge.whatsappDone || 0),
    whatsappTarget: Number(challenge.whatsappTarget || 5),
    completed: Boolean(challenge.completed),
    streak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalXP: streak.totalXP,
  });
}
