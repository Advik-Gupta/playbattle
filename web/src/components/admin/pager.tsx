import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Pager({
  base,
  page,
  total,
  size,
  query,
}: {
  base: string;
  page: number;
  total: number;
  size: number;
  query?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  const suffix = query ? `&q=${encodeURIComponent(query)}` : '';

  return (
    <div className="mt-6 flex items-center justify-between">
      {page <= 1 ? (
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link href={`${base}?page=${page - 1}${suffix}`}>Previous</Link>
        </Button>
      )}

      <span className="text-sm text-muted-foreground">
        Page {page} of {pages} · {total} total
      </span>

      {page >= pages ? (
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link href={`${base}?page=${page + 1}${suffix}`}>Next</Link>
        </Button>
      )}
    </div>
  );
}
