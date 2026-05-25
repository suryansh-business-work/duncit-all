import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Breadcrumbs, CircularProgress, Link, Stack, Typography } from '@mui/material';
import { CREATE_VENUE_LEAD, UPDATE_VENUE_LEAD, VENUE_LEAD } from '../../api/crm.gql';
import { useCrmConfig } from '../../api/useCrmConfig';
import { VenueLeadForm, fromVenueLead, toVenueLeadInput, type VenueLeadFormValues } from '../../forms/venue-lead';
import type { VenueLead } from '../../api/crm.types';

export default function VenueLeadEditorPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { config, loading: cfgLoading } = useCrmConfig();
  const { data, loading: leadLoading } = useQuery(VENUE_LEAD, { variables: { id }, skip: !isEdit, fetchPolicy: 'cache-and-network' });
  const [createLead, { loading: creating }] = useMutation(CREATE_VENUE_LEAD);
  const [updateLead, { loading: updating }] = useMutation(UPDATE_VENUE_LEAD);
  const lead = data?.venueLead as VenueLead | undefined;

  const submit = async (values: VenueLeadFormValues) => {
    const input = toVenueLeadInput(values);
    if (isEdit) await updateLead({ variables: { id, input } });
    else await createLead({ variables: { input } });
    navigate('/venue-leads');
  };

  if (cfgLoading || (isEdit && leadLoading)) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>;
  }
  if (isEdit && !lead) return <Alert severity="error">Venue lead not found.</Alert>;

  return (
    <Stack spacing={2}>
      <Box>
        <Breadcrumbs sx={{ mb: 0.5 }}>
          <Link component="button" type="button" underline="hover" color="inherit" onClick={() => navigate('/venue-leads')}>
            Venue Leads
          </Link>
          <Typography color="text.primary">{isEdit ? 'Edit' : 'New'}</Typography>
        </Breadcrumbs>
        <Typography variant="h5" fontWeight={800}>{isEdit ? `Edit ${lead?.venue_name}` : 'New Venue Lead'}</Typography>
      </Box>
      <VenueLeadForm
        config={config}
        initialValues={lead ? fromVenueLead(lead) : undefined}
        submitting={creating || updating}
        submitLabel={isEdit ? 'Update venue lead' : 'Create venue lead'}
        onSubmit={submit}
        onCancel={() => navigate('/venue-leads')}
      />
    </Stack>
  );
}
