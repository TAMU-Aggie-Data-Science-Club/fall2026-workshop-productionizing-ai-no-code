import type { Metadata } from 'next';
import { TopicDirectory } from '@/components/lab/page-navigation';

export const metadata: Metadata = { title: 'Topics · Productionizing an LLM' };

export default function Topics() {
  return (
    <>
      <div className="section-intro">
        <div>
          <h1>Topics</h1>
        </div>
      </div>
      <TopicDirectory />
    </>
  );
}
