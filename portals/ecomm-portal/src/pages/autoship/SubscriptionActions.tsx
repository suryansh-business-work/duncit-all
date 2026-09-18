import { Stack } from '@mui/material';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BlockIcon from '@mui/icons-material/Block';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { StoreSubscriptionRow, SubscriptionStatus } from './queries';

interface SubscriptionActionsProps {
  row: StoreSubscriptionRow;
  onSet: (row: StoreSubscriptionRow, status: SubscriptionStatus) => void;
}

/** Pause or resume a plan, or cancel it for good; a cancelled plan has nothing left to do. */
export default function SubscriptionActions({ row, onSet }: Readonly<SubscriptionActionsProps>) {
  const { t } = useTranslation();
  if (row.status === 'CANCELLED') return null;
  const vars = { vars: { name: row.buyer_name || row.buyer_email } };
  const paused = row.status === 'PAUSED';
  return (
    <Stack direction="row" spacing={0.5} component="span" data-row-click="ignore">
      {paused ? (
        <DuncitButton size="small" startIcon={<PlayArrowIcon />} onClick={() => onSet(row, 'ACTIVE')} aria-label={t('ecommPortal.autoship.resumeNamed', vars)}>
          {t('ecommPortal.autoship.resume')}
        </DuncitButton>
      ) : (
        <DuncitButton size="small" startIcon={<PauseIcon />} onClick={() => onSet(row, 'PAUSED')} aria-label={t('ecommPortal.autoship.pauseNamed', vars)}>
          {t('ecommPortal.autoship.pause')}
        </DuncitButton>
      )}
      <DuncitButton
        size="small"
        color="error"
        startIcon={<BlockIcon />}
        onClick={() => onSet(row, 'CANCELLED')}
        aria-label={t('ecommPortal.autoship.cancelNamed', vars)}
      >
        {t('ecommPortal.autoship.cancelPlan')}
      </DuncitButton>
    </Stack>
  );
}
