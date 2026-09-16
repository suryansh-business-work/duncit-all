import { Stack } from '@mui/material';
import SmsIcon from '@mui/icons-material/Sms';
import VerifiedIcon from '@mui/icons-material/Verified';
import ReplayIcon from '@mui/icons-material/Replay';
import KeyIcon from '@mui/icons-material/Key';
import { StatCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { Msg91WidgetDay } from '../queries';

const TILE_SX = { flex: 1, minWidth: 200 };

/** "92%" — the share of requests verified; "—" when nothing was asked. */
const verifyRate = (total: Msg91WidgetDay) =>
  total.total > 0 ? `${Math.round((total.verified / total.total) * 100)}%` : '—';

/** The window's headline numbers, from MSG91's own total row. */
export default function AnalyticsTiles({ total }: Readonly<{ total: Msg91WidgetDay }>) {
  const { t } = useTranslation();
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <StatCard
        sx={TILE_SX}
        icon={<SmsIcon fontSize="small" />}
        label={t('tech.msg91.tileRequests')}
        value={total.total.toLocaleString()}
        hint={t('tech.msg91.tileRequestsHint')}
      />
      <StatCard
        sx={TILE_SX}
        icon={<VerifiedIcon fontSize="small" />}
        label={t('tech.msg91.tileVerified')}
        value={total.verified.toLocaleString()}
        hint={t('tech.msg91.tileVerifiedHint', { vars: { rate: verifyRate(total) } })}
      />
      <StatCard
        sx={TILE_SX}
        icon={<ReplayIcon fontSize="small" />}
        label={t('tech.msg91.tileRetries')}
        value={total.retries.toLocaleString()}
        hint={t('tech.msg91.tileRetriesHint')}
      />
      <StatCard
        sx={TILE_SX}
        icon={<KeyIcon fontSize="small" />}
        label={t('tech.msg91.tileTokens')}
        value={total.token_verified.toLocaleString()}
        hint={t('tech.msg91.tileTokensHint')}
      />
    </Stack>
  );
}
