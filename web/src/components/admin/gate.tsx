import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function Gate({
  action,
  error,
  configured,
}: {
  action: (formData: FormData) => Promise<void>;
  error: boolean;
  configured: boolean;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-xs">
        <CardContent className="flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">enter code</h1>
            <p className="mt-1 text-sm text-muted-foreground">staff only</p>
          </div>

          {configured ? (
            <form action={action} className="flex flex-col gap-3">
              <Input
                name="code"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="code"
                required
              />
              {error && <p className="text-sm text-red-500">Wrong code.</p>}
              <Button type="submit">Unlock</Button>
            </form>
          ) : (
            <p className="text-sm text-red-500">ADMIN_CODE is not set on the server.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
