import type { ReactElement } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlined';
import { DuncitButton } from '@duncit/buttons';
import { InfoRow } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { BrandIntegrationStatus } from '../queries';

interface Props {
  title: string;
  status: BrandIntegrationStatus;
  checking: boolean;
  onCheck: () => void;
}

type Translate = ReturnType<typeof useTranslation>['t'];

interface StateChip {
  label: string;
  color: 'success' | 'error' | 'default';
  icon: ReactElement;
}

const DASH = '—';

/** Not set up → nothing to check; set up but refused → the vendor said no. */
const stateChip = (status: BrandIntegrationStatus, t: Translate): StateChip => {
  if (!status.configured) {
    return { label: t('products.brandReview.notConfigured'), color: 'default', icon: <RemoveCircleOutlineIcon /> };
  }
  if (status.connected) {
    return { label: t('products.brandReview.connected'), color: 'success', icon: <CheckCircleIcon /> };
  }
  return { label: t('products.brandReview.notConnected'), color: 'error', icon: <ErrorOutlineIcon /> };
};

export default function BrandIntegrationCard({ title, status, checking, onCheck }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const chip = stateChip(status, t);
  const provider = status.provider.toLowerCase();
  const modeLabel = status.live_mode ? t('products.brandReview.liveMode') : t('products.brandReview.testMode');
  return (
    <Card variant="outlined" sx={{ flex: 1 }} data-testid={`brand-integration-${provider}`}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
          <Typography component="h3" variant="subtitle2" sx={{ flex: 1, fontWeight: 700 }}>
            {title}
          </Typography>
          {status.provider === 'RAZORPAY' && status.configured && (
            <Chip size="small" variant="outlined" color={status.live_mode ? 'warning' : 'default'} label={modeLabel} />
          )}
          <Chip size="small" color={chip.color} icon={chip.icon} label={chip.label} />
        </Stack>

        <Stack spacing={1} sx={{ mt: 1.5 }}>
          <InfoRow variant="inline" label={t('products.brandReview.identifier')} value={status.identifier || DASH} />
          {status.provider === 'SHIPROCKET' && (
            <InfoRow
              variant="inline"
              label={t('products.brandReview.pickupNickname')}
              value={status.pickup_location || DASH}
            />
          )}
          {status.checked_at && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('products.brandReview.checkedAt', { vars: { when: formatDateTime(status.checked_at) } })}
            </Typography>
          )}
          {status.message && <Typography variant="body2">{status.message}</Typography>}
          {status.details.length > 0 && (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {status.details.map((detail) => (
                <li key={detail}>
                  <Typography variant="caption">{detail}</Typography>
                </li>
              ))}
            </Box>
          )}
        </Stack>

        <DuncitButton
          size="small"
          variant="outlined"
          loading={checking}
          onClick={onCheck}
          sx={{ mt: 2 }}
          data-testid={`brand-integration-check-${provider}`}
        >
          {t('products.brandReview.recheck')}
        </DuncitButton>
      </CardContent>
    </Card>
  );
}
