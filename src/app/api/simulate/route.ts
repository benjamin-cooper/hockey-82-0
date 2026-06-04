import { NextRequest, NextResponse } from 'next/server';
import { getPlayerById } from '@/lib/players';
import { simulateSeason } from '@/lib/simulation';

// POST /api/simulate  body: { playerIds: number[] }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const ids: number[] = body.playerIds ?? [];

  if (ids.length !== 6) {
    return NextResponse.json({ error: 'Exactly 6 players required' }, { status: 400 });
  }

  const players = ids.map(id => getPlayerById(id)).filter(Boolean) as NonNullable<ReturnType<typeof getPlayerById>>[];
  if (players.length !== 6) {
    return NextResponse.json({ error: 'One or more players not found' }, { status: 404 });
  }

  const result = simulateSeason(players);
  return NextResponse.json(result);
}
