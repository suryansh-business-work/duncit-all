import { Alert, Chip, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { BrandIntegrationStatus } from '../../queries';

interface ChipsProps {
  status: BrandIntegrationStatus | undefined;
}

/** Connected / Not connected / Not set up, Razorpay's live-or-test mode, and when it was last checked. */
export function IntegrationChips({ status }: Readonly<ChipsProps>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  if (!status?.configured) {
    return <Chip size="small" label={t('partners.brandWizard.integration.notConfigured')} data-testid="integration-chip-state" />;
  }
  const stateLabel = status.connected
    ? t('partners.brandWizard.integration.connected')
    : t('partners.brandWizard.integration.notConnected');
  const modeLabel = status.live_mode
    ? t('partners.brandWizard.integration.liveMode')
    : t('partners.brandWizard.integration.testMode');
  return (
    <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
      <Stack direction="row" spacing={0.5}>
        <Chip size="small" color={status.connected ? 'success' : 'error'} label={stateLabel} data-testid="integration-chip-state" />
        {status.provider === 'RAZORPAY' && (
          <Chip
            size="small"
            variant="outlined"
            color={status.live_mode ? 'warning' : 'default'}
            label={modeLabel}
            data-testid="integration-chip-mode"
          />
        )}
      </Stack>
      {status.checked_at && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('partners.brandWizard.integration.checkedAt', { vars: { when: formatDateTime(status.checked_at) } })}
        </Typography>
      )}
    </Stack>
  );
}

interface ResultProps {
  result: BrandIntegrationStatus;
}

/** What the vendor answered on the last check — the message, then each detail line. */
export function IntegrationResult({ result }: Readonly<ResultProps>) {
  return (
    <Alert severity={result.connected ? 'success' : 'error'} data-testid="integration-result">
      {result.message}
      {result.details.length > 0 && (
        <List dense disablePadding sx={{ mt: 0.5 }}>
          {result.details.map((line) => (
            <ListItem key={line} disableGutters sx={{ py: 0 }}>
              <ListItemText primary={line} slotProps={{ primary: { variant: 'caption' } }} />
            </ListItem>
          ))}
        </List>
      )}
    </Alert>
  );
}
