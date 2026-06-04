import { NextRequest, NextResponse } from 'next/server';
import { randomDraftSlot } from '@/lib/players';
import { Position, POSITIONS } from '@/types';

// GET /api/draft-slot?used=MTL-1980s,BOS-1970s&unfilled=C,LD,G
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const usedParam     = searchParams.get('used')     ?? '';
  const unfilledParam = searchParams.get('unfilled') ?? '';

  const used     = usedParam     ? usedParam.split(',')     : [];
  const unfilled = unfilledParam ? (unfilledParam.split(',') as Position[]) : [...POSITIONS];

  const slot = randomDraftSlot(used, unfilled);
  if (!slot) {
    return NextResponse.json({ error: 'No available slots' }, { status: 404 });
  }

  return NextResponse.json(slot);
}
