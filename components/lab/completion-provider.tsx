'use client';
import { useCallback, useState } from 'react';
import { CompletionContext, type CompletedBuild } from './completion-state';
import { Completion } from './completion';

export function CompletionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [build, setBuild] = useState<CompletedBuild | null>(null);
  const finish = useCallback((completed: CompletedBuild) => {
    if (!completed.result.passed) return;
    setBuild({ config: { ...completed.config }, result: completed.result });
  }, []);
  return (
    <CompletionContext.Provider value={{ build, finish }}>
      {build ? <Completion /> : children}
    </CompletionContext.Provider>
  );
}
