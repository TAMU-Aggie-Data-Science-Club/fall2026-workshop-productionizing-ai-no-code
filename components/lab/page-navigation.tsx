'use client';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon } from 'lucide-react';
import { lessonPath, workshopPath } from '@/lib/paths';
import { useActivityProgress } from './activity-progress';

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
  {
    href: '/challenge',
    label: 'Build your app',
  },
];

export function PageNavigation({ current }: { current: string }) {
  const { hasInteracted } = useActivityProgress();
  const index = PAGES.findIndex((page) => page.href === lessonPath(current));
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
              href={workshopPath(previous.href)}
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
          {next && hasInteracted ? (
            <PaginationLink
              size="default"
              className="lesson-page-link next-lesson"
              href={workshopPath(next.href)}
              rel="next"
              role="link"
            >
              Next
              <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
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
