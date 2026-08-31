import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { CREATE_HOST_LEAD, HOST_LEAD, UPDATE_HOST_LEAD } from '../../api/crm.gql';
import { useCrmConfig } from '../../api/useCrmConfig';
import { HostLeadForm, fromHostLead, toHostLeadInput, type HostLeadFormValues } from '../../forms/host-lead';
import { hostLeadInitialValues } from '../../forms/host-lead/host-lead.types';
import { mergeAiPrefill } from '../../forms/aiPrefill';
import type { HostLead } from '../../api/crm.types';
import { useTranslation } from '@duncit/shell';

export default function HostLeadEditorPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const location = useLocation();
  const { config, loading: cfgLoading } = useCrmConfig();
  const { data, loading: leadLoading } = useQuery<any>(HOST_LEAD, { variables: { id }, skip: !isEdit, fetchPolicy: 'cache-and-network' });
  const [createLead, { loading: creating }] = useMutation<any>(CREATE_HOST_LEAD);
  const [updateLead, { loading: updating }] = useMutation<any>(UPDATE_HOST_LEAD);
  const lead = data?.hostLead as HostLead | undefined;
  const aiPrefill = (location.state as { aiPrefill?: Partial<HostLeadFormValues> } | null)?.aiPrefill;

  const initialValues = useMemo<HostLeadFormValues>(() => {
    if (lead) return fromHostLead(lead);
    return mergeAiPrefill(hostLeadInitialValues, aiPrefill);
  }, [lead, aiPrefill]);

  const submit = async (values: HostLeadFormValues) => {
    const input = toHostLeadInput(values);
    if (isEdit) await updateLead({ variables: { id, input } });
    else await createLead({ variables: { input } });
    navigate('/host-leads');
  };

  if (cfgLoading || (isEdit && leadLoading)) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>;
  }
  if (isEdit && !lead) return <Alert severity="error">{t('crm.hostLeads.hostLeadNotFound')}</Alert>;

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" sx={{
          fontWeight: 800
        }}>{isEdit ? `Edit ${lead?.host_name}` : 'New Host Lead'}</Typography>
        {!isEdit && aiPrefill && (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            AI-prefilled draft — review every section before saving.
          </Typography>
        )}
      </Box>
      <HostLeadForm
        config={config}
        initialValues={initialValues}
        submitting={creating || updating}
        submitLabel={isEdit ? 'Update host lead' : 'Create host lead'}
        onSubmit={submit}
        onCancel={() => navigate('/host-leads')}
      />
    </Stack>
  );
}
