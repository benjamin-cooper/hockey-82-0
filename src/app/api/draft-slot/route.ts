import { NextRequest, NextResponse } from 'next/server';
import { randomDraftSlot } from '@/lib/players';
import { Position, POSITIONS } from '@/types';

// GET /api/draft-slot?round=0&used=MTL-1980s,BOS-1970s
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const round = parseInt(searchParams.get('round') ?? '0', 10);
  const usedParam = searchParams.get('used') ?? '';
  const used = usedParam ? usedParam.split(',') : [];

  const position = POSITIONS[round] as Position;
  if (!position) {
    return NextResponse.json({ error: 'Invalid round' }, { status: 400 });
  }

  const slot = randomDraftSlot(position, used);
  if (!slot) {
    return NextResponse.json({ error: 'No available slots' }, { status: 404 });
  }

  return NextResponse.json({ position, ...slot });
}
