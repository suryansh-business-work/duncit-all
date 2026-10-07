import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';

import {
  CreatePodOptionsDocument,
  ModeratePodContentDocument,
  MyPodDraftDocument,
  PublishPodDraftDocument,
  SavePodDraftDocument,
} from '@/graphql/create-pod';
import {
  STEP_TITLES,
  blankCreatePodForm,
  buildCreatePodInput,
  buildModerationInput,
  hydrateDraft,
  serializeDraft,
  type CreatePodFormValues,
  type PodModerationResult,
} from '@/components/create-pod';
import { graphqlRequest } from '@/services/graphql.client';
import { useAppSettingsStore } from '@/stores/app-settings.store';
import { appFormatter } from '@/utils/app-formatter';
import { loadPartnerRequestPrefill } from '@/hooks/partnerRequestPrefill';

type OptionsData = ResultOf<typeof CreatePodOptionsDocument>;
type DraftData = ResultOf<typeof MyPodDraftDocument>['myPodDraft'];
export type CreatePodClub = OptionsData['clubs'][number];
export type CreatePodVenue = OptionsData['publicVenues'][number];

const clampStep = (step: number) => Math.min(Math.max(step, 0), STEP_TITLES.length - 1);

/** Fallbacks keep the pricing panel rendering while settings load. */
const blankFinance = { platform_fee_pct: 0, gst_pct: 0, currency_symbol: '₹' };

/** publicVenues are already APPROVED; keep only active venue partners. */
const activeVenues = (options: OptionsData | null) =>
  (options?.publicVenues ?? []).filter((venue) => venue.is_active !== false);

/**
 * The admin's date-time input pattern, read once when the prefill is built — the
 * same pattern step 3 types a picked slot in. Read from the store rather than a
 * subscribing hook so opening Create Pod does not re-render or refetch settings.
 */
const slotInputFormat = () =>
  appFormatter(useAppSettingsStore.getState().data?.publicAppSettings).dateTimeInputFormat;

async function loadCreatePodData(draftId: string | undefined, partnerRequestId: string) {
  const options = await graphqlRequest(CreatePodOptionsDocument, undefined, { auth: true });
  const draft = draftId
    ? (await graphqlRequest(MyPodDraftDocument, { draft_id: draftId }, { auth: true })).myPodDraft
    : null;
  // A Pod Request only seeds a FRESH pod — a resumed draft is already the host's.
  const prefill =
    !draft && partnerRequestId
      ? await loadPartnerRequestPrefill(
          partnerRequestId,
          activeVenues(options),
          slotInputFormat(),
        ).catch((error: unknown) => {
          // The pod can still be created by hand; the failure is reported, not dropped.
          logs.mobileApp.error('useCreatePod', 'loadPartnerRequestPrefill', { error });
          return null;
        })
      : null;
  return { options, draft, prefill };
}

/**
 * Data layer for the host Create Pod stepper: loads the host status, the
 * clubs/approved venues/products to pick from, hydrates a draft when resuming,
 * lays a confirmed Pod Request's venue + slot over a fresh pod, and
 * autosaves/publishes the draft server-side.
 */
export function useCreatePod(draftId?: string, partnerRequestId = '') {
  const [data, setData] = useState<OptionsData | null>(null);
  const [initialValues, setInitialValues] = useState<CreatePodFormValues>(blankCreatePodForm);
  const [initialStep, setInitialStep] = useState(0);
  const [resolvedDraftId, setResolvedDraftId] = useState<string | null>(draftId ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [pinnedVenueId, setPinnedVenueId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const applyDraft = (draft: NonNullable<DraftData>) => {
      const values = hydrateDraft(draft.payload);
      setInitialValues(values);
      // A draft started from a Pod Request keeps that venue on offer too.
      setPinnedVenueId(values.partner_request_id ? values.venue_id : undefined);
      setInitialStep(clampStep(draft.step));
      setResolvedDraftId(draft.id);
    };
    loadCreatePodData(draftId, partnerRequestId)
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
          setInitialValues({
            ...blankCreatePodForm,
            location_id: preferred,
            ...result.prefill?.values,
          });
          setPinnedVenueId(result.prefill?.pinnedVenueId);
        }
      })
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [draftId, partnerRequestId]);

  const saveDraft = async (id: string | null, payload: ReturnType<typeof serializeDraft>) => {
    const res = await graphqlRequest(
      SavePodDraftDocument,
      { draft_id: id, input: payload },
      { auth: true },
    );
    return res.savePodDraft.id;
  };
  const publish = async (id: string, input: ReturnType<typeof buildCreatePodInput>) => {
    const res = await graphqlRequest(
      PublishPodDraftDocument,
      { draft_id: id, input },
      { auth: true },
    );
    return res.publishPodDraft;
  };
  // AI + rules moderation preflight run when the host taps "Create Pod".
  const moderate = async (
    input: ReturnType<typeof buildModerationInput>,
  ): Promise<PodModerationResult> => {
    const res = await graphqlRequest(ModeratePodContentDocument, { input }, { auth: true });
    return res.moderatePodContent;
  };

  // Host access mirrors the server's createForPartner check: the cached HOST
  // role OR an approved, active host profile (legacy/HOSTREQ hosts may lack the
  // role in me.roles but are still allowed to create pods).
  const isHost =
    (data?.me?.roles ?? []).includes('HOST') ||
    (data?.myHost?.status === 'APPROVED' && data?.myHost?.is_active !== false);

  return {
    isHost,
    viewerUserId: data?.me?.user_id ?? '',
    clubs: data?.clubs ?? [],
    locations: data?.locations ?? [],
    venues: activeVenues(data),
    products: data?.availablePodProducts ?? [],
    // SUB categories carry the admin-set minimum pax that floors the spots slider.
    subCategories: data?.subCategories ?? [],
    hostCategories: data?.myHost?.host_categories ?? [],
    finance: data?.publicFinanceSettings ?? blankFinance,
    isLoading,
    initialValues,
    initialStep,
    initialDraftId: resolvedDraftId,
    pinnedVenueId,
    saveDraft,
    moderate,
    publish,
  };
}
