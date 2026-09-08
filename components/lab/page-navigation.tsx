import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';

export const PAGES = [
  {
    href: '/streaming',
    label: 'Streaming',
  },
  {
    href: '/tokens',
    label: 'Tokens & cost',
  },
  {
    href: '/retrieval',
    label: 'Context & retrieval',
  },
  {
    href: '/caching',
    label: 'Caching',
  },
  {
    href: '/queues',
    label: 'Traffic & queues',
  },
  {
    href: '/batching',
    label: 'Batching',
  },
  {
    href: '/quality',
    label: 'Quality checks',
  },
  {
    href: '/playground',
    label: 'Playground',
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
          {previous ? (
            <PaginationLink
              size="default"
              className="lesson-page-link"
              href={previous.href}
              rel="prev"
              role="link"
            >
              Previous
            </PaginationLink>
          ) : (
            <Button disabled variant="outline" className="lesson-page-link">
              Previous
            </Button>
          )}
        </PaginationItem>
        <PaginationItem>
          {next ? (
            <PaginationLink
              size="default"
              className="lesson-page-link next-lesson"
              href={next.href}
              rel="next"
              role="link"
            >
              Next
            </PaginationLink>
          ) : (
            <Button disabled className="lesson-page-link next-lesson">
              Next
            </Button>
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
