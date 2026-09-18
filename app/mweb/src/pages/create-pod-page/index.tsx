import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitRoundButton } from '@duncit/buttons';
import { POD_PICKER_PRODUCT_FIELDS } from '@duncit/pod-product-picker';
import {
  CreatePodStepper,
  blankCreatePodForm,
  hydrateDraft,
  STEP_TITLES,
  type DraftPayload,
  type CreatePodFormValues,
} from './create-pod';
import { useTranslation } from '../../i18n/useTranslation';
import { useAppLocation } from '../../app/AppLocationContext';
import StudioPageHeader from '../../components/StudioPageHeader';

const CREATE_POD_OPTIONS = gql`
  query CreatePodOptions {
    me { user_id roles }
    clubs(filter: { is_active: true }) {
      id
      club_name
      location_id
      locality
      super_category_id
      category_id
      matched_venues_count
      matched_venues { id }
      club_description
      club_feature_images_and_videos { url type }
    }
    locations(filter: { is_active: true }) {
      id
      location_name
      city
      state
      state_code
      country
      country_code
      location_image
      location_pincode
      active_club_count
      location_zones { zone_name pincode active_club_count }
    }
    publicVenues {
      id
      owner_user_id
      location_id
      venue_name
      venue_type
      capacity
      capacity_items { label capacity }
      cover_image_url
      city
      locality
      address_line1
      state
      postal_code
      country
      lat
      lng
      owner_name
      owner_phone
      owner_email
      is_active
    }
    myHost {
      id
      status
      is_active
      host_categories {
        super_category_id
        category_id
        sub_category_id
        super_category_name
        category_name
        sub_category_name
      }
    }
    subCategories: categories(filter: { level: SUB }) {
      id
      min_pax
    }
    availablePodProducts {
      ...PodPickerProductFields
    }
  }
  ${POD_PICKER_PRODUCT_FIELDS}
`;
const MY_POD_DRAFT = gql`
  query MyPodDraftForEdit($draft_id: ID!) {
    myPodDraft(draft_id: $draft_id) { id payload step }
  }
`;
const SAVE_POD_DRAFT = gql`
  mutation SavePodDraft($draft_id: ID, $input: PodDraftInput!) {
    savePodDraft(draft_id: $draft_id, input: $input) { id }
  }
`;
const PUBLISH_POD_DRAFT = gql`
  mutation PublishPodDraft($draft_id: ID!, $input: CreatePodInput!) {
    publishPodDraft(draft_id: $draft_id, input: $input) { id venue_approval_status }
  }
`;
const MODERATE_POD_CONTENT = gql`
  mutation ModeratePodContent($input: ModeratePodContentInput!) {
    moderatePodContent(input: $input) {
      allowed
      violations { field step type message evidence }
    }
  }
`;

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
  const [publishMut] = useMutation<any>(PUBLISH_POD_DRAFT);
  const [moderateMut] = useMutation<any>(MODERATE_POD_CONTENT);

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

  const draft = draftQuery.data?.myPodDraft;
  // A new pod is in the city the header has selected — step 1 lists that city's
  // localities. The page re-mounts when the header's pick changes.
  const initialValues: CreatePodFormValues = draft
    ? hydrateDraft(draft.payload)
    : { ...blankCreatePodForm, location_id: globalLocationId };
  const initialStep = draft ? Math.min(Math.max(draft.step ?? 0, 0), STEP_TITLES.length - 1) : 0;

  const saveDraft = async (id: string | null, payload: DraftPayload) => {
    const res = await saveMut({ variables: { draft_id: id, input: payload } });
    return res.data.savePodDraft.id as string;
  };
  const publish = async (id: string, input: any) => {
    const res = await publishMut({ variables: { draft_id: id, input } });
    const created = res.data.publishPodDraft;
    // A pod holding a venue slot awaits the venue's decision — land the host on
    // the waiting page instead of Host Management (native twin, rule 27).
    if (created.venue_approval_status === 'PENDING') {
      navigate(`/host/pod-pending/${created.id}`);
    } else {
      navigate('/host/manage');
    }
  };
  const moderate = async (input: any) => {
    const res = await moderateMut({ variables: { input } });
    return res.data.moderatePodContent;
  };

  const loading = (options.loading && !options.data) || (!!draftId && draftQuery.loading && !draftQuery.data);
  let body: React.ReactNode;
  if (loading) {
    body = (
      <Box data-testid="create-pod-loading" sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} />
      </Box>
    );
  } else if (options.error) {
    body = <Alert data-testid="create-pod-page-error" severity="error">{options.error.message}</Alert>;
  } else if (isHost) {
    body = (
      <CreatePodStepper
        initialValues={initialValues}
        initialStep={initialStep}
        initialDraftId={draft?.id ?? null}
        clubs={clubs}
        locations={locations}
        venues={venues}
        products={products}
        subCategories={subCategories}
        hostCategories={hostCategories}
        viewerUserId={viewerUserId}
        onSaveDraft={saveDraft}
        onModerate={moderate}
        onPublish={publish}
      />
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
