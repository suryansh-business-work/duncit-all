import { useCallback, useEffect, useState } from 'react';
import type { ReportCategoryOption } from '@duncit/utils';

import {
  ReportCategoriesDocument,
  ReportPostDocument,
  ReportProfileDocument,
} from '@/graphql/report';
import { graphqlRequest } from '@/services/graphql.client';

type LoadState = 'loading' | 'ready' | 'failed';

/**
 * The reasons the report sheet offers.
 *
 * Not compiled into the app: they are the categories Legal manages in the Legal
 * portal (UGC Monitoring > Settings), so they are read each time the sheet
 * opens — a list kept from an earlier open would offer a category that has
 * since been switched off. `enabled` is the sheet being open.
 *
 * Deliberately not `useReloadableQuery`: the sheet stays mounted behind every
 * rail that can open it, and that hook would join the screen's pull-to-refresh
 * and re-read the categories on every pull, with nobody looking at them.
 */
export function useReportCategories(enabled: boolean) {
  const [categories, setCategories] = useState<ReportCategoryOption[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    setState('loading');
    graphqlRequest<{ reportCategories: ReportCategoryOption[] }>(
      ReportCategoriesDocument,
      undefined,
      { auth: true },
    )
      .then((data) => {
        if (!alive) return;
        setCategories(data.reportCategories);
        setState('ready');
      })
      .catch(() => {
        if (alive) setState('failed');
      });
    return () => {
      alive = false;
    };
  }, [enabled, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { categories, isLoading: state === 'loading', failed: state === 'failed', retry };
}

/**
 * Report a post or a story to the Legal team.
 *
 * `reason` is a report category key. A repeat report from the same person
 * edits their existing one, so this is safe to call twice. Answers with the
 * report's reference — the one its acknowledgement email carries.
 */
export async function reportPost(id: string, reason: string, details: string): Promise<string> {
  const data = await graphqlRequest<
    { reportPost: { id: string; report_no: string } },
    { id: string; reason: string; details: string }
  >(ReportPostDocument, { id, reason, details }, { auth: true });
  return data.reportPost.report_no;
}

/** Report a member's profile — same contract and receipt as `reportPost`. */
export async function reportProfile(id: string, reason: string, details: string): Promise<string> {
  const data = await graphqlRequest<
    { reportProfile: { id: string; report_no: string } },
    { id: string; reason: string; details: string }
  >(ReportProfileDocument, { id, reason, details }, { auth: true });
  return data.reportProfile.report_no;
}
