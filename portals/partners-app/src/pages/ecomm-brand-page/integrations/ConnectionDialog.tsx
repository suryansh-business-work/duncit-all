import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { BrandIntegrationProvider } from '../queries';
import { integrationTitle } from '../brand-wizard/steps/integration-forms';
import { ConnectionForm, connectionToValues, toSaveConnectionVariables, type ConnectionFormValues } from './connection-form';
import { MY_PARTNER_INTEGRATIONS, SAVE_PARTNER_INTEGRATION, type PartnerIntegration } from './integrations.queries';

interface Props {
  open: boolean;
  provider: BrandIntegrationProvider;
  /** The connection being edited; null adds a new one. */
  connection: PartnerIntegration | null;
  onClose: () => void;
  /** The server's copy after the save and vendor check. */
  onSaved?: (connection: PartnerIntegration) => void;
}

/**
 * Add or edit one saved connection. The save runs the vendor check, so a key
 * the vendor refuses is still saved — its card says why — and the dialog
 * closes either way; a refusal of the save itself stays in the dialog.
 */
export default function ConnectionDialog({ open, provider, connection, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [save, { loading }] = useMutation(SAVE_PARTNER_INTEGRATION, {
    refetchQueries: [{ query: MY_PARTNER_INTEGRATIONS }],
    awaitRefetchQueries: true,
  });
  const providerName = integrationTitle(t, provider);
  const titleId = `connection-dialog-${provider.toLowerCase()}`;

  const close = () => {
    setApiError(null);
    onClose();
  };

  const submit = async (values: ConnectionFormValues) => {
    setApiError(null);
    try {
      const res = await save({ variables: toSaveConnectionVariables(provider, connection?.id ?? null, values) });
      const saved = res.data?.savePartnerIntegration;
      if (!saved) return;
      notifySuccess(t('partners.integrations.saved'));
      onSaved?.(saved);
      close();
    } catch (error) {
      setApiError(parseApiError(error));
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby={titleId}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <span id={titleId}>
          {connection
            ? t('partners.integrations.editTitle', { vars: { provider: providerName } })
            : t('partners.integrations.addTitle', { vars: { provider: providerName } })}
        </span>
        <DuncitIconButton size="small" onClick={close} aria-label={t('shell.common.close')}>
          <CloseIcon />
        </DuncitIconButton>
      </DialogTitle>
      <DialogContent dividers>
        <ConnectionForm
          key={connection?.id ?? 'new'}
          provider={provider}
          defaultValues={connectionToValues(connection)}
          hasSecret={connection?.status.has_secret === true}
          busy={loading}
          apiError={apiError}
          onSave={submit}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  );
}
