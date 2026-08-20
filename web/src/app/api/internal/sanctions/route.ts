import { NextResponse } from 'next/server';
import { activeSanctions, hasDatabase } from '@/lib/db';

export async function GET(request: Request) {
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret || request.headers.get('x-internal-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!hasDatabase) return NextResponse.json({ bans: [], warnings: [] });

  return NextResponse.json(await activeSanctions());
}
