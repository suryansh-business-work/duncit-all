import { useCallback, useEffect, useState } from 'react';
import type { PodChangePenalties, PodChangeRole, PodChangeRow } from '@duncit/utils';

import { PodChangeDecision, PodChangeRole as GqlPodChangeRole } from '@/generated/graphql/graphql';
import {
  PodChangeBoardDocument,
  RequestPodChangeDocument,
  RespondToPodChangeDocument,
  WithdrawPodChangeDocument,
} from '@/graphql/pod-change-requests';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * Request Change, on a phone — the RN twin of `ChangeRequestBoard` and
 * `useRequestPodChange` in `@duncit/pod-change-requests` (rule 27).
 *
 * ONE hook for both halves, because they are one round trip: `myPodChangeBoard`
 * answers what is waiting on you, what you asked for, AND what each role's ask
 * currently costs. Filing a request needs that last number before the sheet can
 * open, so a second query would either duplicate the read or quote a stale
 * price.
 *
 * Every write REFETCHES rather than patching state: approving a request moves a
 * pod's venue, host or club, and a list that guessed at the result would show
 * something the next person to look would not.
 */
export interface ChangeRequestBoard {
  mine: PodChangeRow[];
  incoming: PodChangeRow[];
  penalties: PodChangePenalties;
}

/**
 * The shared string union, in the enum the generated variables expect.
 *
 * `@duncit/utils` types the role as a plain union so a framework-free package
 * can own the rules (rule 40); codegen emits a TS enum. Mapping here keeps ONE
 * definition of a role in the app and confines the translation to this file.
 */
const GQL_ROLE: Record<PodChangeRole, GqlPodChangeRole> = {
  VENUE: GqlPodChangeRole.Venue,
  HOST: GqlPodChangeRole.Host,
  CLUB_ADMIN: GqlPodChangeRole.ClubAdmin,
};

const GQL_DECISION = {
  APPROVE: PodChangeDecision.Approve,
  PASS: PodChangeDecision.Pass,
} as const;

const EMPTY: ChangeRequestBoard = {
  mine: [],
  incoming: [],
  penalties: { venue_penalty: 0, host_penalty: 0, club_admin_penalty: 0 },
};

export function usePodChangeRequests() {
  const [board, setBoard] = useState<ChangeRequestBoard>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await graphqlRequest(PodChangeBoardDocument, {}, { auth: true });
    const data = res.myPodChangeBoard;
    setBoard({
      mine: (data?.mine ?? []) as unknown as PodChangeRow[],
      incoming: (data?.incoming ?? []) as unknown as PodChangeRow[],
      penalties: {
        venue_penalty: data?.venue_penalty ?? 0,
        host_penalty: data?.host_penalty ?? 0,
        club_admin_penalty: data?.club_admin_penalty ?? 0,
      },
    });
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setFailed(false);
    load()
      .catch(() => active && setFailed(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  /** One write path, so no caller decides for itself what to do on failure. */
  const run = useCallback(
    async (write: () => Promise<unknown>, done: string) => {
      setBusy(true);
      setFeedback(null);
      try {
        await write();
        await load();
        setFeedback({ ok: true, text: done });
        return true;
      } catch (error) {
        setFeedback({ ok: false, text: (error as Error).message });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const file = useCallback(
    (podDocId: string, role: PodChangeRole, reason: string, done: string) =>
      run(
        () =>
          graphqlRequest(
            RequestPodChangeDocument,
            { pod_doc_id: podDocId, role: GQL_ROLE[role], reason },
            { auth: true },
          ),
        done,
      ),
    [run],
  );

  const respond = useCallback(
    (requestId: string, decision: 'APPROVE' | 'PASS', reason: string, done: string) =>
      run(
        () =>
          graphqlRequest(
            RespondToPodChangeDocument,
            { request_id: requestId, decision: GQL_DECISION[decision], reason },
            { auth: true },
          ),
        done,
      ),
    [run],
  );

  const withdraw = useCallback(
    (requestId: string, done: string) =>
      run(
        () => graphqlRequest(WithdrawPodChangeDocument, { request_id: requestId }, { auth: true }),
        done,
      ),
    [run],
  );

  return {
    board,
    isLoading,
    failed,
    busy,
    feedback,
    clearFeedback: () => setFeedback(null),
    reload: load,
    file,
    respond,
    withdraw,
  };
}
