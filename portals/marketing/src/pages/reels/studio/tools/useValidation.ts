import { useCallback, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { VALIDATE_REEL } from '../../queries';
import type { ReelCheck } from '../../types';
import type { SocialPlatform } from '../../../social-accounts-page/queries';

const sorted = (list: readonly SocialPlatform[]): SocialPlatform[] => [...list].sort((x, y) => x.localeCompare(y));

/** The same networks in any order are the same ask. */
export function sameSet(a: readonly SocialPlatform[], b: readonly SocialPlatform[]): boolean {
  if (a.length !== b.length) return false;
  const other = sorted(b);
  return sorted(a).every((item, index) => item === other[index]);
}

/**
 * The pre-export checks, run on demand for the networks picked. Asked for
 * again with the same networks, the server is asked again — the reel may have
 * changed since — rather than answered from the cache.
 */
export function useValidation(projectId: string) {
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [asked, setAsked] = useState<SocialPlatform[] | null>(null);
  const { data, loading, error, refetch } = useQuery<{ validateReel: ReelCheck[] }>(VALIDATE_REEL, {
    variables: { project_id: projectId, platforms: asked ?? [] },
    skip: asked === null,
    fetchPolicy: 'network-only',
  });

  const run = useCallback(() => {
    if (platforms.length === 0) return;
    if (asked && sameSet(asked, platforms)) {
      refetch().catch(() => undefined);
      return;
    }
    setAsked([...platforms]);
  }, [asked, platforms, refetch]);

  return { platforms, setPlatforms, run, loading, error, checks: data?.validateReel ?? null };
}

export type Validation = ReturnType<typeof useValidation>;

/** How many checks passed, and how many there were. */
export const checkTally = (checks: readonly ReelCheck[]): { passed: number; total: number } => ({
  passed: checks.filter((check) => check.pass).length,
  total: checks.length,
});
