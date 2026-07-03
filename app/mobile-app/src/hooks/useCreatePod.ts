import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  CreatePodOptionsDocument,
  MyPodDraftDocument,
  PublishPodDraftDocument,
  SavePodDraftDocument,
} from '@/graphql/create-pod';
import {
  STEP_TITLES,
  blankCreatePodForm,
  buildCreatePodInput,
  hydrateDraft,
  serializeDraft,
  type CreatePodFormValues,
} from '@/components/create-pod';
import { graphqlRequest } from '@/services/graphql.client';

type OptionsData = ResultOf<typeof CreatePodOptionsDocument>;
type DraftData = ResultOf<typeof MyPodDraftDocument>['myPodDraft'];
export type CreatePodClub = OptionsData['clubs'][number];
export type CreatePodVenue = OptionsData['publicVenues'][number];

const clampStep = (step: number) => Math.min(Math.max(step, 0), STEP_TITLES.length - 1);

/** Fallbacks keep the pricing panel rendering while settings load. */
const blankFinance = { platform_fee_pct: 0, gst_pct: 0, currency_symbol: '₹' };

async function loadCreatePodData(draftId?: string) {
  const options = await graphqlRequest(CreatePodOptionsDocument, undefined, { auth: true });
  const draft = draftId
    ? (await graphqlRequest(MyPodDraftDocument, { draft_id: draftId }, { auth: true })).myPodDraft
    : null;
  return { options, draft };
}

/**
 * Data layer for the host Create Pod stepper: loads the host status, the
 * clubs/approved venues/products to pick from, hydrates a draft when resuming,
 * and autosaves/publishes the draft server-side.
 */
export function useCreatePod(draftId?: string) {
  const [data, setData] = useState<OptionsData | null>(null);
  const [initialValues, setInitialValues] = useState<CreatePodFormValues>(blankCreatePodForm);
  const [initialStep, setInitialStep] = useState(0);
  const [resolvedDraftId, setResolvedDraftId] = useState<string | null>(draftId ?? null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const applyDraft = (draft: NonNullable<DraftData>) => {
      setInitialValues(hydrateDraft(draft.payload));
      setInitialStep(clampStep(draft.step));
      setResolvedDraftId(draft.id);
    };
    loadCreatePodData(draftId)
      .then((result) => {
        if (!active) return;
        setData(result.options);
        if (result.draft) {
          applyDraft(result.draft);
        } else {
          // A fresh pod starts in the host's selected location (header pick).
          const locations = result.options.locations ?? [];
          const preferred =
            locations.find((item) => item.id === result.options.me?.selected_location_id)?.id ??
            locations[0]?.id ??
            '';
          setInitialValues({ ...blankCreatePodForm, location_id: preferred });
        }
      })
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [draftId]);

  const saveDraft = async (id: string | null, payload: ReturnType<typeof serializeDraft>) => {
    const res = await graphqlRequest(
      SavePodDraftDocument,
      { draft_id: id, input: payload },
      { auth: true },
    );
    return res.savePodDraft.id;
  };
  const publish = async (id: string, input: ReturnType<typeof buildCreatePodInput>) => {
    await graphqlRequest(PublishPodDraftDocument, { draft_id: id, input }, { auth: true });
  };

  return {
    isHost: (data?.me?.roles ?? []).includes('HOST'),
    viewerUserId: data?.me?.user_id ?? '',
    clubs: data?.clubs ?? [],
    locations: data?.locations ?? [],
    // publicVenues are already APPROVED; keep only active venue partners.
    venues: (data?.publicVenues ?? []).filter((venue) => venue.is_active !== false),
    products: data?.availablePodProducts ?? [],
    hostCategories: data?.myHost?.host_categories ?? [],
    finance: data?.publicFinanceSettings ?? blankFinance,
    isLoading,
    initialValues,
    initialStep,
    initialDraftId: resolvedDraftId,
    saveDraft,
    publish,
  };
}
