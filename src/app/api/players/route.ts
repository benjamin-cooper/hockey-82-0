import { NextRequest, NextResponse } from 'next/server';
import { getPlayersForCombo } from '@/lib/players';
import { Position, POSITIONS } from '@/types';

// GET /api/players?franchise=EDM&decade=1980s&unfilled=C,LW,RW,LD,RD,G
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const franchiseAbbr = searchParams.get('franchise') ?? '';
  const decade        = searchParams.get('decade')    ?? '';
  const unfilledParam = searchParams.get('unfilled')  ?? '';
  const unfilled      = unfilledParam ? (unfilledParam.split(',') as Position[]) : [...POSITIONS];

  if (!franchiseAbbr || !decade) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const players = getPlayersForCombo(franchiseAbbr, decade, unfilled);
  return NextResponse.json({ players });
}
