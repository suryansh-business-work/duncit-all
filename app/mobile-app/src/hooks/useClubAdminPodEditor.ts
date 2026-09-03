import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  blankCreatePodForm,
  buildModerationInput,
  hostCategoryKeyOf,
  podToCreatePodForm,
  type CreatePodFormValues,
  type PodHostOption,
  type PodModerationResult,
} from '@/components/create-pod';
import type { CreatePodInput } from '@/generated/graphql/graphql';
import {
  ClubAdminClubDocument,
  ClubAdminCreatePodDocument,
  ClubAdminHostSearchDocument,
  ClubAdminPodForEditDocument,
  ClubAdminUpdatePodDocument,
} from '@/graphql/club-admin';
import { CreatePodOptionsDocument, ModeratePodContentDocument } from '@/graphql/create-pod';
import { graphqlRequest } from '@/services/graphql.client';
import { appFormatter } from '@/utils/app-formatter';

type OptionsData = ResultOf<typeof CreatePodOptionsDocument>;
type EditorClub = NonNullable<ResultOf<typeof ClubAdminClubDocument>['club']>;
type EditorPod = NonNullable<ResultOf<typeof ClubAdminPodForEditDocument>['clubAdminPodForEdit']>;

/** What a save did — the notice the pods list shows on return. */
export type ClubAdminSaveKind = 'created' | 'updated';

interface Loaded {
  options: OptionsData;
  club: EditorClub | null;
  pod: EditorPod | null;
}

async function loadEditor(clubId: string, podId?: string): Promise<Loaded> {
  const [options, clubRes, podRes] = await Promise.all([
    graphqlRequest(CreatePodOptionsDocument, undefined, { auth: true }),
    graphqlRequest(ClubAdminClubDocument, { club_doc_id: clubId }, { auth: true }),
    podId
      ? graphqlRequest(ClubAdminPodForEditDocument, { pod_doc_id: podId }, { auth: true })
      : null,
  ]);
  return { options, club: clubRes.club ?? null, pod: podRes?.clubAdminPodForEdit ?? null };
}

/**
 * Where the form starts: an existing pod rehydrated, or a new one pinned to
 * the club in the club's own city. Either way the category is the club's —
 * the host's category picker is hidden in this mode, and the Organizer Terms
 * are the HOST's undertaking, which mWeb's club-admin editor does not ask a
 * club admin to sign either (rule 27).
 */
function seedValues(club: EditorClub, pod: EditorPod | null): CreatePodFormValues {
  const base = pod
    ? podToCreatePodForm(pod, appFormatter().dateTimeInputFormat)
    : { ...blankCreatePodForm, location_id: club.location_id ?? '', locality: club.locality ?? '' };
  return {
    ...base,
    club_id: club.id,
    host_category_key: hostCategoryKeyOf({
      super_category_id: club.super_category_id,
      sub_category_id: club.category_id,
    }),
    agreed_to_terms: true,
  };
}

/** Labelled seed for the pod's preselected hosts (`host_names` is id-ordered). */
const hostSeed = (pod: EditorPod | null): PodHostOption[] =>
  (pod?.pod_hosts_id ?? []).map((id, index) => ({
    user_id: id,
    full_name: pod?.host_names[index] ?? id,
  }));

/**
 * Data layer for the Club Admin's pod editor — the native twin of
 * `useClubAdminPodEditor` in @duncit/pod-form (rule 27): the same lookups the
 * host stepper loads, the pinned club, the pod being edited, host search and
 * the two club-admin mutations behind one `submit`.
 */
export function useClubAdminPodEditor(clubId: string, podId?: string) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);
    loadEditor(clubId, podId)
      .then((result) => active && setLoaded(result))
      .catch(() => active && setHasError(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [clubId, podId, attempt]);

  const searchHosts = useCallback(async (term: string): Promise<PodHostOption[]> => {
    const res = await graphqlRequest(
      ClubAdminHostSearchDocument,
      { search: term || null },
      { auth: true },
    );
    return res.clubAdminHostSearch;
  }, []);

  // The same AI + rules preflight the host stepper runs before publishing.
  const moderate = async (
    input: ReturnType<typeof buildModerationInput>,
  ): Promise<PodModerationResult> => {
    const res = await graphqlRequest(ModeratePodContentDocument, { input }, { auth: true });
    return res.moderatePodContent;
  };

  const pod = loaded?.pod ?? null;
  const club = loaded?.club ?? null;

  const submit = async (input: CreatePodInput, hostIds: string[]): Promise<ClubAdminSaveKind> => {
    // Every save stays pinned to this club server-side.
    const payload = { ...input, club_id: clubId, pod_hosts_id: hostIds };
    if (!pod) {
      await graphqlRequest(ClubAdminCreatePodDocument, { input: payload }, { auth: true });
      return 'created';
    }
    // Only a genuinely different slot is a re-route; re-saving the same one
    // would needlessly release and re-request the venue's approval.
    const { venue_slot_id, ...unchangedSlot } = payload;
    const sameSlot = (venue_slot_id ?? null) === (pod.venue_slot_id ?? null);
    await graphqlRequest(
      ClubAdminUpdatePodDocument,
      { pod_doc_id: pod.id, input: sameSlot ? unchangedSlot : payload },
      { auth: true },
    );
    return 'updated';
  };

  const initialValues = useMemo(
    () => (club ? seedValues(club, pod) : blankCreatePodForm),
    [club, pod],
  );

  return {
    isLoading,
    hasError,
    notFound: !isLoading && !hasError && (!club || (!!podId && !pod)),
    club,
    options: loaded?.options ?? null,
    viewerUserId: loaded?.options.me?.user_id ?? '',
    initialValues,
    initialHosts: hostSeed(pod),
    searchHosts,
    moderate,
    submit,
    refetch: () => setAttempt((value) => value + 1),
  };
}
