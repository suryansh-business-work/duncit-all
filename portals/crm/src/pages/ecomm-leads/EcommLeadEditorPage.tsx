import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { CREATE_ECOMM_LEAD, ECOMM_LEAD, UPDATE_ECOMM_LEAD } from '../../api/crm.gql';
import { useCrmConfig } from '../../api/useCrmConfig';
import { EcommLeadForm, fromEcommLead, toEcommLeadInput, type EcommLeadFormValues } from '../../forms/ecomm-lead';
import { ecommLeadInitialValues } from '../../forms/ecomm-lead/ecomm-lead.types';
import type { EcommLead } from '../../api/crm.types';

export default function EcommLeadEditorPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { config, loading: cfgLoading } = useCrmConfig();
  const { data, loading: leadLoading } = useQuery(ECOMM_LEAD, { variables: { id }, skip: !isEdit, fetchPolicy: 'cache-and-network' });
  const [createLead, { loading: creating }] = useMutation(CREATE_ECOMM_LEAD);
  const [updateLead, { loading: updating }] = useMutation(UPDATE_ECOMM_LEAD);
  const lead = data?.ecommLead as EcommLead | undefined;

  const initialValues = useMemo<EcommLeadFormValues>(
    () => (lead ? fromEcommLead(lead) : ecommLeadInitialValues),
    [lead]
  );

  const submit = async (values: EcommLeadFormValues) => {
    const input = toEcommLeadInput(values);
    if (isEdit) await updateLead({ variables: { id, input } });
    else await createLead({ variables: { input } });
    navigate('/ecomm-leads');
  };

  if (cfgLoading || (isEdit && leadLoading)) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>;
  }
  if (isEdit && !lead) return <Alert severity="error">Ecomm lead not found.</Alert>;

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" fontWeight={800}>{isEdit ? `Edit ${lead?.seller_name}` : 'New Ecomm Lead'}</Typography>
      </Box>
      <EcommLeadForm
        config={config}
        initialValues={initialValues}
        submitting={creating || updating}
        submitLabel={isEdit ? 'Update ecomm lead' : 'Create ecomm lead'}
        onSubmit={submit}
        onCancel={() => navigate('/ecomm-leads')}
      />
    </Stack>
  );
}
