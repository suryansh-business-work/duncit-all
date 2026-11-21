import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';
import { createPodCatalogRows, createPodGrantedRows, resumeCreatePodStep } from '@duncit/utils';

import {
  CreatePodOptionsDocument,
  HostAgainPrefillDocument,
  ModeratePodContentDocument,
  MyPodDraftDocument,
  PublishPodDraftDocument,
  SavePodDraftDocument,
} from '@/graphql/create-pod';
import {
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
import { pickedVenueFreshSeed, pickedVenueOf } from '@/hooks/pickedVenuePrefill';
import { errorCode } from '@/utils/errors';

type OptionsData = ResultOf<typeof CreatePodOptionsDocument>;
export type HostAgainPrefill = ResultOf<typeof HostAgainPrefillDocument>['hostAgainPrefill'];
export type CreatePodClub = OptionsData['clubs'][number];
export type CreatePodVenue = OptionsData['publicVenues'][number];

/** Fallbacks keep the pricing panel rendering while settings load. */
const blankFinance = { platform_fee_pct: 0, gst_pct: 0, currency_symbol: '₹' };

/** publicVenues are already APPROVED; keep only active venue partners. */
const activeVenues = (options: OptionsData | null) =>
  (options?.publicVenues ?? []).filter((venue) => venue.is_active !== false);

/** Every active sub the host is granted: a whole Category (or Super) grant opens each sub beneath it. */
const grantedCategories = (options: OptionsData | null) =>
  createPodGrantedRows(
    createPodCatalogRows(
      options?.superCategories ?? [],
      options?.parentCategories ?? [],
      options?.subCategories ?? [],
    ),
    options?.myHost?.host_categories ?? [],
  );

/**
 * The admin's date-time input pattern, read once when the prefill is built — the
 * same pattern step 3 types a picked slot in. Read from the store rather than a
 * subscribing hook so opening Create Pod does not re-render or refetch settings.
 */
const slotInputFormat = () =>
  appFormatter(useAppSettingsStore.getState().data?.publicAppSettings).dateTimeInputFormat;

/** "Host again": the form filled from an earlier pod, or `failed` when it cannot
 * be read — the screen then says so instead of opening a blank form. */
async function loadHostAgain(podId: string): Promise<HostAgainPrefill | 'failed'> {
  try {
    return (await graphqlRequest(HostAgainPrefillDocument, { pod_doc_id: podId }, { auth: true }))
      .hostAgainPrefill;
  } catch (error) {
    logs.mobileApp.error('useCreatePod', 'hostAgainPrefill', { error });
    return 'failed';
  }
}

/** The draft saved under this id, or null when there is none yet — Create Pod
 * mints the id before the first save, so NOT_FOUND is simply a new pod. Any
 * other failure is thrown: a blank form must never autosave over a real draft. */
async function loadDraft(draftId: string) {
  try {
    return (await graphqlRequest(MyPodDraftDocument, { draft_id: draftId }, { auth: true }))
      .myPodDraft;
  } catch (error) {
    if (errorCode(error) === 'NOT_FOUND') return null;
    throw error;
  }
}

async function loadCreatePodData(
  draftId: string | undefined,
  partnerRequestId: string,
  hostAgainPodId: string,
) {
  const options = await graphqlRequest(CreatePodOptionsDocument, undefined, { auth: true });
  const draft = draftId ? await loadDraft(draftId) : null;
  const hostAgain = !draft && hostAgainPodId ? await loadHostAgain(hostAgainPodId) : null;
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
  return { options, draft, prefill, hostAgain };
}

/**
 * Data layer for the host Create Pod stepper: loads the host status, the
 * clubs/approved venues/products to pick from, hydrates a draft when resuming,
 * lays a confirmed Pod Request's venue + slot over a fresh pod, fills the form
 * from an earlier pod for "Host again" (saving nothing until the host moves on),
 * and autosaves/publishes the draft server-side.
 */
export function useCreatePod(
  draftId?: string,
  partnerRequestId = '',
  hostAgainPodId = '',
  pickVenueId = '',
) {
  const [data, setData] = useState<OptionsData | null>(null);
  const [initialValues, setInitialValues] = useState<CreatePodFormValues>(blankCreatePodForm);
  const [initialStep, setInitialStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pinnedVenueId, setPinnedVenueId] = useState<string | undefined>(undefined);
  const [pickedVenueId, setPickedVenueId] = useState<string | undefined>(undefined);
  const [hostAgain, setHostAgain] = useState<HostAgainPrefill | 'failed' | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadFailed(false);
    // A draft, or a Host Again copy not saved yet. One whose city is gone
    // opens in the header's: step 1 can only move a pod that is in a city.
    const applyStored = (
      stored: { payload: string; step: number },
      fallbackLocationId: string,
      pickedId: string | undefined,
    ) => {
      const values = hydrateDraft(stored.payload);
      setInitialValues({ ...values, location_id: values.location_id || fallbackLocationId });
      // A draft started from a Pod Request, or still on the venue picked from
      // Venue Details, keeps that venue on offer too.
      const keepsVenue = !!values.partner_request_id || (!!pickedId && values.venue_id === pickedId);
      setPinnedVenueId(keepsVenue ? values.venue_id : undefined);
      // A draft the old five-step stepper saved opens on the step that now holds its screen.
      setInitialStep(resumeCreatePodStep(stored.step, stored.payload));
    };
    loadCreatePodData(draftId, partnerRequestId, hostAgainPodId)
      .then((result) => {
        if (!active) return;
        setData(result.options);
        setHostAgain(result.hostAgain);
        // A fresh pod starts in the host's selected location (header pick).
        const locations = result.options.locations ?? [];
        const preferred =
          locations.find((item) => item.id === result.options.me?.selected_location_id)?.id ??
          locations[0]?.id ??
          '';
        // "Pick This Venue for Pod" on Venue Details: a physical pod at that venue.
        const picked = pickedVenueOf(pickVenueId, partnerRequestId, activeVenues(result.options));
        setPickedVenueId(picked?.id);
        if (result.draft) {
          applyStored(result.draft, preferred, picked?.id);
        } else if (result.hostAgain && result.hostAgain !== 'failed') {
          applyStored(result.hostAgain, preferred, picked?.id);
        } else {
          const seed = picked
            ? pickedVenueFreshSeed(picked, locations, grantedCategories(result.options))
            : null;
          setInitialValues({
            ...blankCreatePodForm,
            location_id: preferred,
            ...seed?.values,
            ...result.prefill?.values,
          });
          setInitialStep(seed?.step ?? 0);
          setPinnedVenueId(result.prefill?.pinnedVenueId ?? picked?.id);
        }
      })
      .catch((error: unknown) => {
        // Said on screen with a retry — never a blank form posing as the draft.
        logs.mobileApp.error('useCreatePod', 'load', { error });
        if (active) setLoadFailed(true);
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [draftId, partnerRequestId, hostAgainPodId, pickVenueId, attempt]);

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
    // What's category tiles: a sub-category's icon, else its parent's.
    categoryIcons: [...(data?.subCategories ?? []), ...(data?.parentCategories ?? [])],
    hostCategories: grantedCategories(data),
    finance: data?.publicFinanceSettings ?? blankFinance,
    isLoading,
    initialValues,
    initialStep,
    initialDraftId: draftId ?? null,
    loadFailed,
    retry: () => setAttempt((count) => count + 1),
    hostAgain,
    /** The header's city — a Host Again copy in another city says so. */
    selectedLocationId: data?.me?.selected_location_id ?? '',
    pinnedVenueId,
    /** The venue picked on Venue Details, while Create Pod can offer it. */
    pickedVenueId,
    saveDraft,
    moderate,
    publish,
  };
}
