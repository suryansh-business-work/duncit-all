import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useParams } from 'react-router';
import { Alert, Box, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { ProspectLeadEntity } from '../../api/crm.types';
import type { ProspectLead } from '../../api/prospectLeads.types';
import { useCrmConfig } from '../../api/useCrmConfig';
import { ProspectLeadForm, type ProspectLeadFormValues } from '../../forms/prospect-lead';
import { useLeadEditorFlow } from '../../hooks/useLeadEditorFlow';
import { PROSPECT_KINDS } from './prospectKinds';

type LeadResult = Record<string, ProspectLead | null>;
type Variables = { id?: string; input?: Record<string, unknown> };

/** New / edit page for one creator or community lead. */
export default function ProspectLeadEditorPage({ entity }: Readonly<{ entity: ProspectLeadEntity }>) {
  const kind = PROSPECT_KINDS[entity];
  const { t } = useTranslation();
  const { id } = useParams();
  const isEdit = !!id;
  const { config, loading: cfgLoading } = useCrmConfig();
  const { data, loading: leadLoading } = useQuery<LeadResult, Variables>(kind.docs.get, {
    variables: { id },
    skip: !isEdit,
    fetchPolicy: 'cache-and-network',
  });
  const [createLead, { loading: creating }] = useMutation<LeadResult, Variables>(kind.docs.create);
  const [updateLead, { loading: updating }] = useMutation<LeadResult, Variables>(kind.docs.update);
  const lead = data?.[kind.docs.getKey] ?? undefined;

  const initialValues = useMemo<ProspectLeadFormValues>(
    () => (lead ? kind.fromLead(lead) : kind.initialValues),
    [lead, kind]
  );

  const flow = useLeadEditorFlow<ProspectLeadFormValues>(kind.basePath, id, async (values) => {
    const input = kind.toInput(values);
    const saved = isEdit
      ? (await updateLead({ variables: { id, input } })).data?.[kind.docs.updateKey]
      : (await createLead({ variables: { input } })).data?.[kind.docs.createKey];
    if (!saved) throw new Error(t(kind.copy.notFound));
    return saved;
  });

  if (cfgLoading || (isEdit && leadLoading && !lead)) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (isEdit && !lead) return <Alert severity="error">{t(kind.copy.notFound)}</Alert>;

  return (
    <Stack spacing={2}>
      <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
        {isEdit && lead ? t(kind.copy.editLead, { vars: { name: kind.displayName(lead) } }) : t(kind.copy.newLead)}
      </Typography>
      <ProspectLeadForm<ProspectLeadFormValues>
        key={lead?.id ?? 'new'}
        entity={entity}
        config={config}
        initialValues={initialValues}
        submitting={creating || updating}
        submitLabel={isEdit ? t(kind.copy.updateLabel) : t(kind.copy.createLabel)}
        onSubmit={flow.submit}
        onSubmitAndContinue={flow.submitAndContinue}
        continueLabel={isEdit ? t('crm.forms.updateAndContinue') : t('crm.forms.createAndContinue')}
        onCancel={flow.exit}
      />
      <Snackbar open={!!flow.notice} autoHideDuration={4000} onClose={flow.clearNotice} message={flow.notice ?? ''} />
    </Stack>
  );
}
