import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { CREATE_VENUE_LEAD, UPDATE_VENUE_LEAD, VENUE_LEAD } from '../../api/crm.gql';
import { useCrmConfig } from '../../api/useCrmConfig';
import { VenueLeadForm, fromVenueLead, toVenueLeadInput, type VenueLeadFormValues } from '../../forms/venue-lead';
import { venueLeadInitialValues } from '../../forms/venue-lead/venue-lead.types';
import { mergeAiPrefill } from '../../forms/aiPrefill';
import type { VenueLead } from '../../api/crm.types';

export default function VenueLeadEditorPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const location = useLocation();
  const { config, loading: cfgLoading } = useCrmConfig();
  const { data, loading: leadLoading } = useQuery(VENUE_LEAD, { variables: { id }, skip: !isEdit, fetchPolicy: 'cache-and-network' });
  const [createLead, { loading: creating }] = useMutation(CREATE_VENUE_LEAD);
  const [updateLead, { loading: updating }] = useMutation(UPDATE_VENUE_LEAD);
  const lead = data?.venueLead as VenueLead | undefined;
  const aiPrefill = (location.state as { aiPrefill?: Partial<VenueLeadFormValues> } | null)?.aiPrefill;

  const initialValues = useMemo<VenueLeadFormValues>(() => {
    if (lead) return fromVenueLead(lead);
    return mergeAiPrefill(venueLeadInitialValues, aiPrefill);
  }, [lead, aiPrefill]);

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
        <Typography variant="h5" fontWeight={800}>{isEdit ? `Edit ${lead?.venue_name}` : 'New Venue Lead'}</Typography>
        {!isEdit && aiPrefill && (
          <Typography variant="caption" color="text.secondary">
            AI-prefilled draft — review every section before saving.
          </Typography>
        )}
      </Box>
      <VenueLeadForm
        config={config}
        initialValues={initialValues}
        submitting={creating || updating}
        submitLabel={isEdit ? 'Update venue lead' : 'Create venue lead'}
        onSubmit={submit}
        onCancel={() => navigate('/venue-leads')}
      />
    </Stack>
  );
}
