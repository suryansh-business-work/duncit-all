import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Paper, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { IntegrationChips, IntegrationResult } from '../brand-wizard/steps/IntegrationStatus';
import {
  DELETE_PARTNER_INTEGRATION,
  MY_PARTNER_INTEGRATIONS,
  RECHECK_PARTNER_INTEGRATION,
  type PartnerIntegration,
} from './integrations.queries';

interface Props {
  connection: PartnerIntegration;
  onEdit: (connection: PartnerIntegration) => void;
}

const refetch = { refetchQueries: [{ query: MY_PARTNER_INTEGRATIONS }], awaitRefetchQueries: true };

/** One saved account: its name and public half, the last check, the brands using it, and what can be done with it. */
export default function ConnectionRow({ connection, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recheck, recheckState] = useMutation(RECHECK_PARTNER_INTEGRATION, refetch);
  const [remove, removeState] = useMutation(DELETE_PARTNER_INTEGRATION, refetch);
  const busy = recheckState.loading || removeState.loading;
  const { status, brands } = connection;
  const inUse = brands.length > 0;
  const testId = `connection-row-${connection.id}`;

  const runRecheck = async () => {
    try {
      await recheck({ variables: { id: connection.id } });
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  const runDelete = async () => {
    try {
      await remove({ variables: { id: connection.id } });
      notifySuccess(t('partners.integrations.deleted'));
    } catch (error) {
      notifyError(parseApiError(error));
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }} data-testid={testId}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
              {connection.label}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
              {status.identifier}
            </Typography>
          </Stack>
          <IntegrationChips status={status} />
        </Stack>
        {!status.connected && status.message && <IntegrationResult result={status} />}
        <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid={`${testId}-brands`}>
          {inUse
            ? t('partners.integrations.usedBy', { vars: { brands: brands.map((b) => b.brand_name).join(', ') } })
            : t('partners.integrations.unused')}
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <DuncitButton variant="outlined" onClick={() => onEdit(connection)} disabled={busy} data-testid={`${testId}-edit`}>
            {t('partners.integrations.edit')}
          </DuncitButton>
          <DuncitButton variant="outlined" onClick={runRecheck} loading={recheckState.loading} disabled={busy}>
            {t('partners.brandWizard.integration.recheck')}
          </DuncitButton>
          <DuncitButton
            color="error"
            onClick={() => setConfirmOpen(true)}
            disabled={busy || inUse}
            aria-describedby={inUse ? `${testId}-delete-hint` : undefined}
            data-testid={`${testId}-delete`}
          >
            {t('partners.integrations.delete')}
          </DuncitButton>
        </Stack>
        {inUse && (
          <Typography id={`${testId}-delete-hint`} variant="caption" sx={{ color: 'text.secondary' }}>
            {t('partners.integrations.deleteInUse')}
          </Typography>
        )}
      </Stack>
      <ConfirmDialog
        open={confirmOpen}
        title={t('partners.integrations.deleteTitle', { vars: { name: connection.label } })}
        message={t('partners.integrations.deleteBody')}
        destructive
        busy={removeState.loading}
        confirmLabel={t('partners.integrations.delete')}
        onConfirm={runDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </Paper>
  );
}
