import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-mono text-5xl font-semibold tracking-tight">404</p>
      <p className="text-sm text-muted-foreground">
        That page does not exist, or the player moved on.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Back home</Link>
      </Button>
    </main>
  );
}
