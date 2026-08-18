import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { lookup } from '@/lib/vocab';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const word = new URL(request.url).searchParams.get('word') ?? '';
  if (!/^[a-zA-Z]{2,20}$/.test(word.trim())) {
    return NextResponse.json({ error: 'bad word' }, { status: 400 });
  }

  const definition = await lookup(word);
  if (!definition) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json(definition);
}
