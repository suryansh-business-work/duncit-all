import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { CreatePodFormView, buildCreatePodInput, type CreatePodFormValues } from './create-pod';

const CREATE_POD_OPTIONS = gql`
  query CreatePodOptions {
    myHost {
      id
      status
    }
    clubs(filter: { is_active: true }) {
      id
      club_name
      meetup_venues_id
    }
    myVenues {
      id
      venue_name
      city
      locality
      status
      is_active
    }
  }
`;

const CREATE_PARTNER_POD = gql`
  mutation CreatePartnerPod($input: CreatePodInput!) {
    createPartnerPod(input: $input) {
      id
    }
  }
`;

/** Host-only page to create a pod — reached from the Home "+" floating button.
 * Submits via createPartnerPod (the host is attached server-side). */
export default function CreatePodPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(CREATE_POD_OPTIONS, {
    fetchPolicy: 'cache-and-network',
  });
  const [createMut] = useMutation(CREATE_PARTNER_POD);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const host = data?.myHost;
  const isApprovedHost = host?.status === 'APPROVED';
  const clubs = data?.clubs ?? [];
  const venues = (data?.myVenues ?? []).filter(
    (venue: any) => venue.status === 'APPROVED' && venue.is_active
  );

  const submit = async (values: CreatePodFormValues) => {
    setBusy(true);
    setOpError(null);
    try {
      await createMut({ variables: { input: buildCreatePodInput(values) } });
      navigate('/host/manage');
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  let body: React.ReactNode;
  if (loading && !data) {
    body = (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  } else if (error) {
    body = <Alert severity="error">{error.message}</Alert>;
  } else if (!isApprovedHost) {
    body = (
      <Alert
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={() => navigate('/become-host')}>
            Become a host
          </Button>
        }
      >
        An approved host profile is required before creating pods.
      </Alert>
    );
  } else {
    body = (
      <CreatePodFormView
        clubs={clubs}
        venues={venues}
        busy={busy}
        error={opError}
        onSubmit={submit}
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
            Plan your next meetup — it goes live as soon as you create it.
          </Typography>
        </Box>
      </Stack>
      {body}
    </Stack>
  );
}
