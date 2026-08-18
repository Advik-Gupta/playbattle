import { CardSkeleton, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-dvh">
      <div className="h-14 border-b border-border" />
      <main className="container max-w-2xl py-10">
        <Skeleton className="mb-6 h-8 w-40" />
        <CardSkeleton rows={4} />
      </main>
    </div>
  );
}
