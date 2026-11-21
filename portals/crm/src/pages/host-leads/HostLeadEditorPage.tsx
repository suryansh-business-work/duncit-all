import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useLocation, useParams } from 'react-router';
import { Alert, Box, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import { CREATE_HOST_LEAD, HOST_LEAD, UPDATE_HOST_LEAD } from '../../api/crm.gql';
import { useCrmConfig } from '../../api/useCrmConfig';
import { HostLeadForm, fromHostLead, toHostLeadInput, type HostLeadFormValues } from '../../forms/host-lead';
import { hostLeadInitialValues } from '../../forms/host-lead/host-lead.types';
import { mergeAiPrefill } from '../../forms/aiPrefill';
import type { HostLead } from '../../api/crm.types';
import { useTranslation } from '@duncit/shell';
import { useLeadEditorFlow } from '../../hooks/useLeadEditorFlow';

export default function HostLeadEditorPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const isEdit = !!id;
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

  const flow = useLeadEditorFlow<HostLeadFormValues>('/host-leads', id, async (values) => {
    const input = toHostLeadInput(values);
    if (isEdit) {
      const { data: updated } = await updateLead({ variables: { id, input } });
      return updated.updateHostLead;
    }
    const { data: created } = await createLead({ variables: { input } });
    return created.createHostLead;
  });

  if (cfgLoading || (isEdit && leadLoading)) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>;
  }
  if (isEdit && !lead) return <Alert severity="error">{t('crm.hostLeads.hostLeadNotFound')}</Alert>;

  return (
    <Stack spacing={2}>
      <Box>
        <Typography component="h1" variant="h5" sx={{
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
        onSubmit={flow.submit}
        onSubmitAndContinue={flow.submitAndContinue}
        continueLabel={isEdit ? t('crm.forms.updateAndContinue') : t('crm.forms.createAndContinue')}
        onCancel={flow.exit}
      />
      <Snackbar open={!!flow.notice} autoHideDuration={4000} onClose={flow.clearNotice} message={flow.notice ?? ''} />
    </Stack>
  );
}
