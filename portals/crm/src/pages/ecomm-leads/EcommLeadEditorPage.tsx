import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useParams } from 'react-router';
import { Alert, Box, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import { CREATE_ECOMM_LEAD, ECOMM_LEAD, UPDATE_ECOMM_LEAD } from '../../api/crm.gql';
import { useCrmConfig } from '../../api/useCrmConfig';
import { EcommLeadForm, fromEcommLead, toEcommLeadInput, type EcommLeadFormValues } from '../../forms/ecomm-lead';
import { ecommLeadInitialValues } from '../../forms/ecomm-lead/ecomm-lead.types';
import type { EcommLead } from '../../api/crm.types';
import { useTranslation } from '@duncit/shell';
import { useLeadEditorFlow } from '../../hooks/useLeadEditorFlow';

export default function EcommLeadEditorPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const isEdit = !!id;
  const { config, loading: cfgLoading } = useCrmConfig();
  const { data, loading: leadLoading } = useQuery<any>(ECOMM_LEAD, { variables: { id }, skip: !isEdit, fetchPolicy: 'cache-and-network' });
  const [createLead, { loading: creating }] = useMutation<any>(CREATE_ECOMM_LEAD);
  const [updateLead, { loading: updating }] = useMutation<any>(UPDATE_ECOMM_LEAD);
  const lead = data?.ecommLead as EcommLead | undefined;

  const initialValues = useMemo<EcommLeadFormValues>(
    () => (lead ? fromEcommLead(lead) : ecommLeadInitialValues),
    [lead]
  );

  const flow = useLeadEditorFlow<EcommLeadFormValues>('/ecomm-leads', id, async (values) => {
    const input = toEcommLeadInput(values);
    if (isEdit) {
      const { data: updated } = await updateLead({ variables: { id, input } });
      return updated.updateEcommLead;
    }
    const { data: created } = await createLead({ variables: { input } });
    return created.createEcommLead;
  });

  if (cfgLoading || (isEdit && leadLoading)) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>;
  }
  if (isEdit && !lead) return <Alert severity="error">{t('crm.ecommLeads.ecommLeadNotFound')}</Alert>;

  return (
    <Stack spacing={2}>
      <Box>
        <Typography component="h1" variant="h5" sx={{
          fontWeight: 800
        }}>{isEdit ? `Edit ${lead?.seller_name}` : 'New Ecomm Lead'}</Typography>
      </Box>
      <EcommLeadForm
        config={config}
        initialValues={initialValues}
        submitting={creating || updating}
        submitLabel={isEdit ? 'Update ecomm lead' : 'Create ecomm lead'}
        onSubmit={flow.submit}
        onSubmitAndContinue={flow.submitAndContinue}
        continueLabel={isEdit ? t('crm.forms.updateAndContinue') : t('crm.forms.createAndContinue')}
        onCancel={flow.exit}
      />
      <Snackbar open={!!flow.notice} autoHideDuration={4000} onClose={flow.clearNotice} message={flow.notice ?? ''} />
    </Stack>
  );
}
