import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Navigate, useLocation, useParams } from 'react-router';
import {
  clubCityName,
  createPodCatalogRows,
  createPodGrantedRows,
  firstGraphQLError,
  isPodDraftId,
  newPodDraftId,
  type DraftAutosaveHandle,
} from '@duncit/utils';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { CreatePodStepper, type DraftPayload, type DraftSaveOptions } from './create-pod';
import { useTranslation } from '../../i18n/useTranslation';
import { useAppLocation } from '../../app/AppLocationContext';
import {
  CREATE_POD_OPTIONS,
  MODERATE_POD_CONTENT,
  MY_POD_DRAFT,
  SAVE_POD_DRAFT,
} from './queries';
import { usePartnerRequestPrefill } from './usePartnerRequestPrefill';
import { useHostAgainPrefill } from './useHostAgainPrefill';
import HostAgainNotice from './HostAgainNotice';
import CreatePodNotHost from './CreatePodNotHost';
import { usePickedVenue } from './usePickedVenue';
import CreatePodHeader from './CreatePodHeader';
import { createPodSeed } from './createPodSeed';
import { useCreatePodPublish } from './useCreatePodPublish';
import type { CreatePodHostCategory, CreatePodLocation } from './create-pod/create-pod.types';

/** Host-only Create Pod page. Every visit is one draft, named in the URL
 * (`/create-pod/:draftId`): opening `/create-pod` mints the id on the device and
 * moves there at once, so a refresh comes back to the same draft. A draft the
 * server does not have yet is a new pod; one it has is resumed. */
export default function CreatePodPage() {
  const { t } = useTranslation();
  const { draftId } = useParams<{ draftId?: string }>();
  const { search } = useLocation();
  const [mintedId] = useState(() => newPodDraftId(() => globalThis.crypto.randomUUID()));
  const [autosave, setAutosave] = useState<DraftAutosaveHandle | null>(null);
  const validId = isPodDraftId(draftId) ? draftId : null;
  const { locationId: globalLocationId } = useAppLocation();
  const options = useQuery<any>(CREATE_POD_OPTIONS, { fetchPolicy: 'cache-and-network' });
  // Always read live: the draft autosaves, so a cached copy is an old one.
  const draftQuery = useQuery<any>(MY_POD_DRAFT, {
    variables: { draft_id: validId },
    skip: !validId,
    fetchPolicy: 'network-only',
  });
  const [saveMut] = useMutation<any>(SAVE_POD_DRAFT);
  const [moderateMut] = useMutation<any>(MODERATE_POD_CONTENT);
  const publish = useCreatePodPublish();

  // Host access mirrors the server's createForPartner check: the cached HOST
  // role OR an approved, active host profile (legacy/HOSTREQ hosts may lack the
  // role in me.roles but are still allowed to create pods).
  const myHost = options.data?.myHost;
  const isHost =
    (options.data?.me?.roles ?? []).includes('HOST') ||
    (myHost?.status === 'APPROVED' && myHost?.is_active !== false);
  const clubs = options.data?.clubs ?? [];
  const locations = options.data?.locations ?? [];
  const products = options.data?.availablePodProducts ?? [];
  // Sub-categories carry the admin-set minimum pax; the stepper looks the pod's
  // up by the selected club's `category_id`.
  const subCategories = options.data?.subCategories ?? [];
  const categoryIcons = [...subCategories, ...(options.data?.parentCategories ?? [])];
  // publicVenues are already APPROVED; keep only active venue partners.
  const venues = (options.data?.publicVenues ?? []).filter((venue: any) => venue.is_active !== false);
  // What lists every active sub the host is granted: a grant of a whole
  // Category (or Super) opens each sub beneath it.
  const hostCategories: CreatePodHostCategory[] = createPodGrantedRows(
    createPodCatalogRows(options.data?.superCategories ?? [], options.data?.parentCategories ?? [], subCategories),
    myHost?.host_categories ?? []
  );
  const viewerUserId = options.data?.me?.user_id ?? '';

  // NOT_FOUND = nothing saved under this id yet: a new pod. Any other failure
  // must not open a blank form that would autosave over the real draft.
  const draftMissing = firstGraphQLError(draftQuery.error)?.extensions?.code === 'NOT_FOUND';
  const draftFailed = !!draftQuery.error && !draftMissing;
  const draft = draftQuery.data?.myPodDraft;
  const isNew = !!validId && !draftQuery.loading && !draft && !draftFailed;
  // Arriving from a confirmed Pod Request: its venue and slot come pre-chosen.
  const prefill = usePartnerRequestPrefill(venues, isNew);
  // "Host again": the form filled from an earlier pod, in THAT pod's city.
  const hostAgain = useHostAgainPrefill(isNew);
  // "Pick This Venue for Pod" on Venue Details: a physical pod at that venue, in its city.
  const picked = usePickedVenue(venues, locations, hostCategories, isNew);

  // A new pod is in the city the header has selected — step 1 lists that city's
  // localities. The page re-mounts when the header's pick changes.
  const fresh = { location_id: globalLocationId, ...picked.seed?.values, ...prefill.values };
  const seed = createPodSeed(draft ?? hostAgain.prefill, fresh, picked.seed?.step);
  const copiedCityId = hostAgain.prefill && seed.values.location_id !== globalLocationId ? seed.values.location_id : '';
  const otherCity = locations.find((item: CreatePodLocation) => copiedCityId && item.id === copiedCityId);

  const saveDraft = async (id: string, payload: DraftPayload, saveOptions?: DraftSaveOptions) => {
    const res = await saveMut({
      variables: { draft_id: id, input: payload },
      context: { fetchOptions: { keepalive: saveOptions?.keepalive ?? false } },
    });
    return res.data.savePodDraft.id as string;
  };
  const moderate = async (input: any) => {
    const res = await moderateMut({ variables: { input } });
    return res.data.moderatePodContent;
  };

  // No usable id yet: mint one and move to it, keeping any prefill query.
  if (!validId) return <Navigate replace to={{ pathname: `/create-pod/${mintedId}`, search }} />;

  const loading =
    (options.loading && !options.data) || draftQuery.loading || prefill.loading || hostAgain.loading;
  // A copy that cannot be read opens nothing rather than a blank form posing as it.
  const pageError = hostAgain.failed ? t('mweb.hostPodActions.hostAgainFailed') : null;
  let body: React.ReactNode;
  if (loading) {
    body = (
      <Box data-testid="create-pod-loading" sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} />
      </Box>
    );
  } else if (draftFailed) {
    body = (
      <Alert
        data-testid="create-pod-draft-error"
        severity="error"
        action={
          <DuncitButton
            data-testid="create-pod-draft-retry"
            color="inherit"
            size="small"
            onClick={() => {
              draftQuery.refetch().catch((error: unknown) => logs.mWeb.warn('create-pod', 'draftRetry', { error }));
            }}
          >
            {t('mweb.createPod.autosave.retry')}
          </DuncitButton>
        }
      >
        {t('mweb.createPod.autosave.loadFailed')}
      </Alert>
    );
  } else if (options.error || prefill.error || pageError) {
    body = (
      <Alert data-testid="create-pod-page-error" severity="error">
        {options.error?.message ?? prefill.error ?? pageError}
      </Alert>
    );
  } else if (isHost) {
    body = (
      <>
        {hostAgain.prefill && (
          <HostAgainNotice prefill={hostAgain.prefill} otherCityName={otherCity ? clubCityName(otherCity) : null} />
        )}
        <CreatePodStepper
          initialValues={seed.values}
          initialStep={seed.step}
          initialDraftId={validId}
          clubs={clubs}
          locations={locations}
          venues={venues}
          products={products}
          subCategories={subCategories}
          categoryIcons={categoryIcons}
          hostCategories={hostCategories}
          viewerUserId={viewerUserId}
          pinnedVenueId={prefill.pinnedVenueId ?? picked.venueId}
          pickedVenueId={picked.venueId}
          onSaveDraft={saveDraft}
          onModerate={moderate}
          onPublish={publish}
          onAutosave={setAutosave}
        />
      </>
    );
  } else {
    body = <CreatePodNotHost />;
  }

  return (
    <Stack data-testid="create-pod-page" spacing={2.5} sx={{ p: 2, maxWidth: 720, mx: 'auto', minHeight: '100%' }}>
      <CreatePodHeader autosave={autosave} />
      {body}
    </Stack>
  );
}
