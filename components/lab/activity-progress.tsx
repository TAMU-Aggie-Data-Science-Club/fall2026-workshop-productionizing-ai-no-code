'use client';
import { createContext, useContext, useState } from 'react';

const ActivityProgressContext = createContext({
  hasInteracted: false,
  markInteracted: () => {},
});

export function ActivityProgress({ children }: { children: React.ReactNode }) {
  const [hasInteracted, setHasInteracted] = useState(false);
  return (
    <ActivityProgressContext.Provider
      value={{ hasInteracted, markInteracted: () => setHasInteracted(true) }}
    >
      {children}
    </ActivityProgressContext.Provider>
  );
}

export function useActivityProgress() {
  return useContext(ActivityProgressContext);
}
