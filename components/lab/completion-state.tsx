'use client';
import { createContext, useContext } from 'react';
import type { ChallengeConfig, ChallengeResult } from '@/lib/challenge';

export type CompletedBuild = {
  config: ChallengeConfig;
  result: ChallengeResult;
};
export const CompletionContext = createContext<{
  build: CompletedBuild | null;
  finish: ((build: CompletedBuild) => void) | null;
}>({ build: null, finish: null });

export const useCompletion = () => useContext(CompletionContext);
