import { useId, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, AlertTitle, Dialog, DialogContent, DialogContentText, DialogTitle, Stack } from '@mui/material';
import type { MutationStartCrmLeadDiscoveryArgs } from '@duncit/gql-types';
import { notifySuccess } from '@duncit/dialogs';
import { PageErrorBoundary, useTranslation } from '@duncit/shell';
import { START_LEAD_DISCOVERY, type LeadDiscoveryJob } from '../../api/leadResearch.gql';
import { LeadDiscoveryForm, toDiscoveryInput, type LeadDiscoveryFormValues } from '../../forms/lead-discovery';
import { discoveryErrorMessage, isNotConfigured } from './discoveryErrors';
import { JOBS_REFETCH } from './useDiscoveryJobs';

interface Props {
  onClose: () => void;
}

interface StartError {
  notConfigured: boolean;
  message: string;
}

/**
 * Discover leads: the request form in a dialog. A started discovery runs in the
 * background (its progress is in the list and the header); a missing Serper key
 * is called out on its own so the person knows who has to fix it.
 */
export default function DiscoveryDialog({ onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [error, setError] = useState<StartError | null>(null);
  const [start, { loading }] = useMutation<{ startCrmLeadDiscovery: LeadDiscoveryJob }, MutationStartCrmLeadDiscoveryArgs>(
    START_LEAD_DISCOVERY,
    { refetchQueries: JOBS_REFETCH }
  );

  const submit = async (values: LeadDiscoveryFormValues) => {
    setError(null);
    try {
      const { data } = await start({ variables: { input: toDiscoveryInput(values) } });
      notifySuccess(t('crm.leadResearch.discoveryStarted', { vars: { label: data?.startCrmLeadDiscovery.label ?? '' } }));
      onClose();
    } catch (err) {
      setError({ notConfigured: isNotConfigured(err), message: discoveryErrorMessage(err, t) });
    }
  };

  return (
    <Dialog open onClose={loading ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{t('crm.leadResearch.discoverTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText>{t('crm.leadResearch.discoverIntro')}</DialogContentText>
          {error?.notConfigured ? (
            <Alert severity="warning" data-testid="discovery-not-configured">
              <AlertTitle>{t('crm.leadResearch.notConfiguredTitle')}</AlertTitle>
              {error.message}
            </Alert>
          ) : null}
          {error && !error.notConfigured ? (
            <Alert severity="error" data-testid="discovery-error">
              {error.message}
            </Alert>
          ) : null}
          <PageErrorBoundary>
            <LeadDiscoveryForm submitting={loading} onSubmit={submit} onCancel={onClose} />
          </PageErrorBoundary>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
