import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';

export const PAGES = [
  {
    href: '/streaming',
    label: 'Streaming',
    question: 'When does the answer appear?',
  },
  {
    href: '/tokens',
    label: 'Tokens & cost',
    question: 'What happens to cost at scale?',
  },
  {
    href: '/retrieval',
    label: 'Context & retrieval',
    question: 'Which sources change the answer?',
  },
  {
    href: '/caching',
    label: 'Caching',
    question: 'When is a saved answer too old?',
  },
  {
    href: '/queues',
    label: 'Traffic & queues',
    question: 'Where do requests spend their time?',
  },
  {
    href: '/batching',
    label: 'Batching',
    question: 'When does grouping requests help?',
  },
  {
    href: '/quality',
    label: 'Quality checks',
    question: 'What can a passing check miss?',
  },
  {
    href: '/playground',
    label: 'Playground',
    question: 'How do the tradeoffs fit together?',
  },
];

export function PageNavigation({ current }: { current: string }) {
  const index = PAGES.findIndex((page) => page.href === current);
  if (index === -1) return null;
  const previous = PAGES[index - 1];
  const next = PAGES[index + 1];
  return (
    <Pagination aria-label="Lesson navigation" className="lesson-pagination">
      <PaginationContent>
        <PaginationItem>
          {previous && (
            <PaginationLink
              size="default"
              className="lesson-page-link"
              href={previous.href}
              rel="prev"
              role="link"
              aria-label={`Previous ${previous.label}`}
            >
              <span>Previous</span>
              <strong>{previous.label}</strong>
            </PaginationLink>
          )}
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            size="default"
            className="lesson-page-link next-lesson"
            href={next?.href ?? '/topics'}
            rel={next ? 'next' : undefined}
            role="link"
            aria-label={next ? `Next ${next.label}` : 'Explore All topics'}
          >
            <span>{next ? 'Next' : 'Explore'}</span>
            <strong>{next?.label ?? 'All topics'}</strong>
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export function TopicDirectory() {
  return (
    <nav aria-label="Topics" className="topic-directory">
      {PAGES.map((page) => (
        <a key={page.href} href={page.href}>
          <h2>{page.label}</h2>
          <p>{page.question}</p>
        </a>
      ))}
    </nav>
  );
}
