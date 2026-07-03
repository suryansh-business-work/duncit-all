import { gql, useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import {
  CreatePodStepper,
  blankCreatePodForm,
  hydrateDraft,
  STEP_TITLES,
  type DraftPayload,
  type CreatePodFormValues,
} from './create-pod';

const CREATE_POD_OPTIONS = gql`
  query CreatePodOptions {
    me { user_id roles selected_location_id }
    clubs(filter: { is_active: true }) {
      id
      club_name
      meetup_venues_id
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
      location_zones { zone_name pincode }
    }
    publicVenues {
      id
      owner_user_id
      location_id
      venue_name
      venue_type
      capacity
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
    availablePodProducts { id product_name unit_cost available_count image_url }
  }
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
    publishPodDraft(draft_id: $draft_id, input: $input) { id }
  }
`;

/** Host-only page to create a pod via the 4-step stepper, reached from the Home
 * "+" button or by resuming a draft from Host Management (`/create-pod/:draftId`). */
export default function CreatePodPage() {
  const navigate = useNavigate();
  const { draftId } = useParams<{ draftId?: string }>();
  const options = useQuery(CREATE_POD_OPTIONS, { fetchPolicy: 'cache-and-network' });
  const draftQuery = useQuery(MY_POD_DRAFT, { variables: { draft_id: draftId }, skip: !draftId });
  const [saveMut] = useMutation(SAVE_POD_DRAFT);
  const [publishMut] = useMutation(PUBLISH_POD_DRAFT);

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
  // publicVenues are already APPROVED; keep only active venue partners.
  const venues = (options.data?.publicVenues ?? []).filter((venue: any) => venue.is_active !== false);
  const hostCategories = options.data?.myHost?.host_categories ?? [];
  const viewerUserId = options.data?.me?.user_id ?? '';

  const draft = draftQuery.data?.myPodDraft;
  // Pod location defaults to the host's selected location (header pick).
  const defaultLocationId =
    locations.find((item: any) => item.id === options.data?.me?.selected_location_id)?.id ??
    locations[0]?.id ??
    '';
  const initialValues: CreatePodFormValues = draft
    ? hydrateDraft(draft.payload)
    : { ...blankCreatePodForm, location_id: defaultLocationId };
  const initialStep = draft ? Math.min(Math.max(draft.step ?? 0, 0), STEP_TITLES.length - 1) : 0;

  const saveDraft = async (id: string | null, payload: DraftPayload) => {
    const res = await saveMut({ variables: { draft_id: id, input: payload } });
    return res.data.savePodDraft.id as string;
  };
  const publish = async (id: string, input: any) => {
    await publishMut({ variables: { draft_id: id, input } });
    navigate('/host/manage');
  };

  const loading = (options.loading && !options.data) || (!!draftId && draftQuery.loading && !draftQuery.data);
  let body: React.ReactNode;
  if (loading) {
    body = (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  } else if (options.error) {
    body = <Alert severity="error">{options.error.message}</Alert>;
  } else if (!isHost) {
    body = (
      <Alert
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={() => navigate('/become-host')}>
            Become a host
          </Button>
        }
      >
        Host access is required before creating pods.
      </Alert>
    );
  } else {
    body = (
      <CreatePodStepper
        initialValues={initialValues}
        initialStep={initialStep}
        initialDraftId={draft?.id ?? null}
        clubs={clubs}
        locations={locations}
        venues={venues}
        products={products}
        hostCategories={hostCategories}
        viewerUserId={viewerUserId}
        onSaveDraft={saveDraft}
        onPublish={publish}
      />
    );
  }

  return (
    <Stack spacing={2} sx={{ p: { xs: 1.5, sm: 2 }, maxWidth: 720, mx: 'auto', minHeight: '100%' }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <AddCircleOutlineIcon color="primary" />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
            Create a Pod
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Your progress saves automatically — finish anytime from Host Management.
          </Typography>
        </Box>
      </Stack>
      {body}
    </Stack>
  );
}
