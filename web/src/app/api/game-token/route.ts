import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { auth } from '@/auth';
import { getProfile } from '@/lib/db';
import { DEFAULT_AVATAR, isAvatarId } from '@/lib/avatars';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const profile = await getProfile(session.user.id);
  const avatar = profile?.avatar ?? '';

  const claims = {
    sub: session.user.id,
    name: profile?.displayName || session.user.name || 'player',
    avatar: isAvatarId(avatar) ? avatar : DEFAULT_AVATAR,
  };

  const secret = process.env.GAME_JWT_SECRET?.trim();

  if (!secret) {
    return NextResponse.json({
      token: null,
      profile: { id: claims.sub, name: claims.name, avatar: claims.avatar },
    });
  }

  const token = jwt.sign(claims, secret, { expiresIn: '2h' });

  return NextResponse.json({
    token,
    profile: { id: claims.sub, name: claims.name, avatar: claims.avatar },
  });
}
