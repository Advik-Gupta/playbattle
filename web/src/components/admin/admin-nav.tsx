import Link from 'next/link';

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/matches', label: 'Matches' },
  { href: '/admin/rooms', label: 'Rooms' },
  { href: '/admin/sanctions', label: 'Sanctions' },
  { href: '/admin/announce', label: 'Announce' },
];

export function AdminNav({ signOutAction }: { signOutAction: () => Promise<void> }) {
  return (
    <header className="border-b border-border">
      <div className="container flex h-14 items-center justify-between">
        <nav className="flex items-center gap-1 text-sm">
          <span className="mr-3 text-sm font-semibold tracking-tight">admin</span>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form action={signOutAction}>
          <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
            Lock
          </button>
        </form>
      </div>
    </header>
  );
}
