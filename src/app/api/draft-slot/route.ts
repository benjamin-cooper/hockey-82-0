import { NextRequest, NextResponse } from 'next/server';
import { randomDraftSlot, RerollLock } from '@/lib/players';
import { Position, POSITIONS } from '@/types';

// GET /api/draft-slot?used=MTL-1980s&unfilled=C,LD,G
// GET /api/draft-slot?used=...&unfilled=...&lockFranchise=EDM   (reroll era)
// GET /api/draft-slot?used=...&unfilled=...&lockDecade=1980s    (reroll team)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const usedParam          = searchParams.get('used')          ?? '';
  const unfilledParam      = searchParams.get('unfilled')      ?? '';
  const lockFranchise      = searchParams.get('lockFranchise') ?? undefined;
  const lockDecade         = searchParams.get('lockDecade')    ?? undefined;

  const used     = usedParam     ? usedParam.split(',')              : [];
  const unfilled = unfilledParam ? (unfilledParam.split(',') as Position[]) : [...POSITIONS];

  const lock: RerollLock | undefined =
    lockFranchise ? { franchiseAbbr: lockFranchise } :
    lockDecade    ? { decade: lockDecade }            :
    undefined;

  const slot = randomDraftSlot(used, unfilled, lock);
  if (!slot) {
    return NextResponse.json({ error: 'No available slots' }, { status: 404 });
  }

  return NextResponse.json(slot);
}
