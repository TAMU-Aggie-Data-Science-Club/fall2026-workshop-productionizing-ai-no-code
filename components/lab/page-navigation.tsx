export const PAGES = [
  { href: '/streaming', label: 'Streaming' },
  { href: '/tokens', label: 'Tokens & cost' },
  { href: '/retrieval', label: 'Context & retrieval' },
  { href: '/caching', label: 'Caching' },
  { href: '/queues', label: 'Traffic & queues' },
  { href: '/batching', label: 'Batching' },
  { href: '/quality', label: 'Quality checks' },
  { href: '/playground', label: 'Playground' },
];

export function PageNavigation({ current }: { current: string }) {
  return (
    <nav aria-label="Concept pages" className="page-navigation">
      {PAGES.map((page) => (
        <a
          key={page.href}
          href={page.href}
          aria-current={current === page.href ? 'page' : undefined}
        >
          {page.label}
        </a>
      ))}
    </nav>
  );
}
