import NextAuth, { type DefaultSession } from 'next-auth';
import Google from 'next-auth/providers/google';
import { getProfile, saveProfile } from '@/lib/db';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/signin' },
  trustHost: process.env.AUTH_TRUST_HOST !== 'false',
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;

      if (user && token.sub) {
        const existing = await getProfile(token.sub);
        if (!existing) {
          await saveProfile(token.sub, {
            email: user.email ?? '',
            name: user.name ?? '',
          });
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
