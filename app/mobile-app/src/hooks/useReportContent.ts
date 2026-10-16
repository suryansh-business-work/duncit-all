import { useCallback, useEffect, useState } from 'react';
import { logs } from '@duncit/logs';
import type { ReportCategoryOption } from '@duncit/utils';

import {
  MyOpenReportDocument,
  ReportCategoriesDocument,
  ReportPostDocument,
  ReportProfileDocument,
  ReportChatMessageDocument,
} from '@/graphql/report';
import { graphqlRequest } from '@/services/graphql.client';

type LoadState = 'loading' | 'ready' | 'failed';

interface OpenReport {
  id: string;
  report_no: string;
}

/**
 * Has the viewer already reported this, with Legal not done with it yet?
 * mWeb twin: components/content-report/useMyOpenReport (rule 27).
 *
 * Asked on every open — Legal can close the earlier report at any moment, so a
 * remembered answer would keep the form locked after it did. A failed check
 * falls back to the form (the server refuses a repeat anyway with
 * REPORT_ALREADY_PENDING) and is logged rather than dropped. Plain request,
 * not `useReloadableQuery`, for the same reason as `useReportCategories`.
 */
export function useMyOpenReport(targetId: string | null) {
  const [pending, setPending] = useState<OpenReport | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setPending(null);
    if (!targetId) {
      setChecking(false);
      return undefined;
    }
    let alive = true;
    setChecking(true);
    graphqlRequest<{ myOpenReport: OpenReport | null }, { id: string }>(
      MyOpenReportDocument,
      { id: targetId },
      { auth: true },
    )
      .then((data) => {
        if (alive) setPending(data.myOpenReport);
      })
      .catch((error: unknown) => {
        logs.mobileApp.warn('contentReport', 'myOpenReport', { error });
      })
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [targetId]);

  return { checking, pending };
}

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
 * `reason` is a report category key. A repeat while the same person's earlier
 * report is still open is refused with REPORT_ALREADY_PENDING. Answers with the
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

/** Report a chat message — same contract and receipt as `reportPost`. */
export async function reportChatMessage(
  id: string,
  reason: string,
  details: string,
): Promise<string> {
  const data = await graphqlRequest<
    { reportChatMessage: { id: string; report_no: string } },
    { id: string; reason: string; details: string }
  >(ReportChatMessageDocument, { id, reason, details }, { auth: true });
  return data.reportChatMessage.report_no;
}
