import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default async function SignIn() {
  const session = await auth();
  if (session?.user) redirect('/');

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">playbattle</h1>
            <p className="mt-1 text-sm text-muted-foreground">sign in to play</p>
          </div>

          <form
            className="w-full"
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/' });
            }}
          >
            <Button type="submit" size="lg" className="w-full">
              continue with google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
