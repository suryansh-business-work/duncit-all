import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { clubCityName } from '@duncit/utils';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitRoundButton } from '@duncit/buttons';
import { CreatePodStepper, type DraftPayload } from './create-pod';
import { useTranslation } from '../../i18n/useTranslation';
import { useAppLocation } from '../../app/AppLocationContext';
import StudioPageHeader from '../../components/StudioPageHeader';
import {
  CREATE_POD_OPTIONS,
  MODERATE_POD_CONTENT,
  MY_POD_DRAFT,
  SAVE_POD_DRAFT,
} from './queries';
import { usePartnerRequestPrefill } from './usePartnerRequestPrefill';
import { useHostAgainPrefill } from './useHostAgainPrefill';
import HostAgainNotice from './HostAgainNotice';
import { createPodSeed } from './createPodSeed';
import { useCreatePodPublish } from './useCreatePodPublish';
import type { CreatePodLocation } from './create-pod/create-pod.types';

/** Host-only page to create a pod via the 4-step stepper, reached from the Home
 * "+" button or by resuming a draft from Host Management (`/create-pod/:draftId`). */
export default function CreatePodPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { draftId } = useParams<{ draftId?: string }>();
  const { locationId: globalLocationId } = useAppLocation();
  const options = useQuery<any>(CREATE_POD_OPTIONS, { fetchPolicy: 'cache-and-network' });
  const draftQuery = useQuery<any>(MY_POD_DRAFT, { variables: { draft_id: draftId }, skip: !draftId });
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
  // publicVenues are already APPROVED; keep only active venue partners.
  const venues = (options.data?.publicVenues ?? []).filter((venue: any) => venue.is_active !== false);
  const hostCategories = options.data?.myHost?.host_categories ?? [];
  const viewerUserId = options.data?.me?.user_id ?? '';

  // Arriving from a confirmed Pod Request: its venue and slot come pre-chosen.
  const prefill = usePartnerRequestPrefill(venues, !draftId);
  // "Host again": the form filled from an earlier pod, in THAT pod's city.
  const hostAgain = useHostAgainPrefill(!draftId);

  const draft = draftQuery.data?.myPodDraft;
  // A new pod is in the city the header has selected — step 1 lists that city's
  // localities. The page re-mounts when the header's pick changes.
  const seed = createPodSeed(draft ?? hostAgain.prefill, { location_id: globalLocationId, ...prefill.values });
  const copiedCityId = hostAgain.prefill && seed.values.location_id !== globalLocationId ? seed.values.location_id : '';
  const otherCity = locations.find((item: CreatePodLocation) => copiedCityId && item.id === copiedCityId);

  const saveDraft = async (id: string | null, payload: DraftPayload) => {
    const res = await saveMut({ variables: { draft_id: id, input: payload } });
    return res.data.savePodDraft.id as string;
  };
  const moderate = async (input: any) => {
    const res = await moderateMut({ variables: { input } });
    return res.data.moderatePodContent;
  };

  const loading =
    (options.loading && !options.data) ||
    (!!draftId && draftQuery.loading && !draftQuery.data) ||
    prefill.loading ||
    hostAgain.loading;
  // A copy that cannot be read opens nothing rather than a blank form posing as it.
  const pageError = hostAgain.failed ? t('mweb.hostPodActions.hostAgainFailed') : null;
  let body: React.ReactNode;
  if (loading) {
    body = (
      <Box data-testid="create-pod-loading" sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} />
      </Box>
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
          initialDraftId={draft?.id ?? null}
          clubs={clubs}
          locations={locations}
          venues={venues}
          products={products}
          subCategories={subCategories}
          hostCategories={hostCategories}
          viewerUserId={viewerUserId}
          pinnedVenueId={prefill.pinnedVenueId}
          onSaveDraft={saveDraft}
          onModerate={moderate}
          onPublish={publish}
        />
      </>
    );
  } else {
    body = (
      <Alert
        data-testid="create-pod-not-host"
        severity="info"
        action={
          <DuncitButton data-testid="create-pod-become-host" color="inherit" size="small" onClick={() => navigate('/become-host')}>
            {t('mweb.createPod.becomeHost')}
          </DuncitButton>
        }
      >
        {t('mweb.createPod.hostRequired')}
      </Alert>
    );
  }

  // The calm page header: round accent mark, the title alone (no subtitle), and
  // a round close button — the native StackScreen header's twin (rule 27).
  return (
    <Stack data-testid="create-pod-page" spacing={2.5} sx={{ p: 2, maxWidth: 720, mx: 'auto', minHeight: '100%' }}>
      <StudioPageHeader
        icon={<AddCircleOutlineIcon fontSize="small" />}
        title={t('mweb.createPod.title')}
        action={
          <DuncitRoundButton
            data-testid="create-pod-page-close"
            tone="paper"
            size="large"
            aria-label={t('mweb.auth.close')}
            onClick={() => navigate('/host/manage')}
          >
            <CloseIcon />
          </DuncitRoundButton>
        }
      />
      {body}
    </Stack>
  );
}
