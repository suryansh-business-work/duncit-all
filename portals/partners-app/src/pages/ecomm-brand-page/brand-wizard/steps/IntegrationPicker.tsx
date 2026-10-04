import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { Alert, Link, MenuItem, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { IntegrationLogo, SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import type { MutationDisconnectBrandIntegrationArgs } from '@duncit/gql-types';
import { useTranslation } from '@duncit/shell';
import { DISCONNECT_BRAND_INTEGRATION, type BrandIntegrationProvider, type BrandIntegrationStatus } from '../../queries';
import ConnectionDialog from '../../integrations/ConnectionDialog';
import { USE_BRAND_INTEGRATION, type PartnerIntegration } from '../../integrations/integrations.queries';
import { IntegrationChips, IntegrationResult } from './IntegrationStatus';
import { integrationIntro, integrationTitle } from './integration-forms';

export const INTEGRATIONS_PATH = '/ecomm-brand/integrations';

interface Props {
  provider: BrandIntegrationProvider;
  /** The brand's copy of the credential, as the server judged it. */
  status: BrandIntegrationStatus | undefined;
  /** The partner's saved connections for this provider; undefined while they load. */
  connections: PartnerIntegration[] | undefined;
  locked: boolean;
  /** The id to mutate against — a new brand is saved first to get one. */
  ensureBrandId: () => Promise<string | null>;
  /** The brand's integration facts changed on the server; reload them. */
  onChanged: () => void;
}

/**
 * Pick which saved Integrations connection the brand ships or gets paid
 * through. Credentials are entered once on the Integrations page (or in the
 * Add dialog here), never per brand; only an account that passed its check
 * can be picked.
 */
export default function IntegrationPicker({ provider, status, connections, locked, ensureBrandId, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [linkConnection, linkState] = useMutation(USE_BRAND_INTEGRATION);
  const [disconnect, disconnectState] = useMutation<unknown, MutationDisconnectBrandIntegrationArgs>(DISCONNECT_BRAND_INTEGRATION);
  const busy = linkState.loading || disconnectState.loading;
  const title = integrationTitle(t, provider);
  const key = provider.toLowerCase();

  const pick = async (integrationId: string) => {
    try {
      const id = await ensureBrandId();
      if (!id) return;
      await linkConnection({ variables: { brand_doc_id: id, provider, integration_id: integrationId } });
      notifySuccess(t('partners.integrations.picked', { vars: { provider: title } }));
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  const runDisconnect = async () => {
    try {
      const id = await ensureBrandId();
      if (!id) return;
      await disconnect({ variables: { brand_doc_id: id, provider } });
      notifySuccess(t('partners.brandWizard.integration.disconnected'));
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    } finally {
      setConfirmOpen(false);
    }
  };

  // A connection added here is picked straight away when its check passed.
  const onAdded = (saved: PartnerIntegration) => {
    if (saved.status.connected) pick(saved.id).catch(() => undefined);
  };

  return (
    <SectionCard
      title={title}
      subtitle={integrationIntro(t, provider)}
      icon={<IntegrationLogo vendor={provider} label={title} />}
      action={<IntegrationChips status={status} />}
    >
      <Stack spacing={2} data-testid={`integration-picker-${key}`}>
        {status?.configured && !status.connected && <IntegrationResult result={status} />}
        {connections?.length === 0 && (
          <Alert severity="info">{t('partners.integrations.noneYet', { vars: { provider: title } })}</Alert>
        )}
        {connections && connections.length > 0 && (
          <TextField
            select
            fullWidth
            label={t('partners.integrations.pickLabel', { vars: { provider: title } })}
            helperText={t('partners.integrations.pickHint')}
            value={status?.connection_id ?? ''}
            disabled={locked || busy}
            onChange={(event) => {
              pick(event.target.value).catch(() => undefined);
            }}
            slotProps={{ htmlInput: { 'data-testid': `integration-picker-${key}-select` } }}
          >
            {connections.map((connection) => (
              <MenuItem key={connection.id} value={connection.id} disabled={!connection.status.connected}>
                {connection.status.connected
                  ? `${connection.label} — ${connection.status.identifier}`
                  : `${connection.label} — ${t('partners.integrations.failedCheck')}`}
              </MenuItem>
            ))}
          </TextField>
        )}
        {!locked && (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <DuncitButton variant="outlined" startIcon={<AddIcon />} onClick={() => setAdding(true)} disabled={busy}>
              {t('partners.integrations.add')}
            </DuncitButton>
            {status?.configured && (
              <DuncitButton color="error" onClick={() => setConfirmOpen(true)} disabled={busy}>
                {t('partners.brandWizard.integration.disconnect')}
              </DuncitButton>
            )}
            <Link component={RouterLink} to={INTEGRATIONS_PATH} variant="body2">
              {t('partners.integrations.manage')}
            </Link>
          </Stack>
        )}
      </Stack>
      <ConnectionDialog open={adding} provider={provider} connection={null} onClose={() => setAdding(false)} onSaved={onAdded} />
      <ConfirmDialog
        open={confirmOpen}
        title={t('partners.brandWizard.integration.disconnectTitle', { vars: { provider: title } })}
        message={t('partners.brandWizard.integration.disconnectBody')}
        destructive
        busy={disconnectState.loading}
        confirmLabel={t('partners.brandWizard.integration.disconnect')}
        onConfirm={runDisconnect}
        onClose={() => setConfirmOpen(false)}
      />
    </SectionCard>
  );
}
