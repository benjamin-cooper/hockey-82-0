import { NextRequest, NextResponse } from 'next/server';
import { getPlayersBySlot } from '@/lib/players';
import { Position } from '@/types';

// GET /api/players?franchise=EDM&decade=1980s&position=C
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const franchiseAbbr = searchParams.get('franchise') ?? '';
  const decade = searchParams.get('decade') ?? '';
  const position = searchParams.get('position') as Position;

  if (!franchiseAbbr || !decade || !position) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const players = getPlayersBySlot(franchiseAbbr, decade, position);
  return NextResponse.json({ players });
}
