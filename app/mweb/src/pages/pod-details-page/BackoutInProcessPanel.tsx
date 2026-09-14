import { Stack } from '@mui/material';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import LockClockIcon from '@mui/icons-material/LockClock';
import { DuncitButton } from '@duncit/buttons';
import { BarLabel, BarNotice } from './BarLabel';
import { ctaButtonSx } from './buttonSx';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** True while the released seat has not been rebooked (restore still possible). */
  canCancel: boolean;
  busy: boolean;
  onKeepSpot: () => void;
}

/**
 * Pod detail panel state while the viewer's booking is in "Backout in process":
 * the seat is released, a replacement is being searched, and the booking can be
 * restored via "Keep My Spot" until the seat is rebooked. Once a replacement is
 * confirmed the backout is locked. Native twin: details/BackoutInProcessBar.
 */
export default function BackoutInProcessPanel({ canCancel, busy, onKeepSpot }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!canCancel) {
    return (
      <Stack direction="row" data-testid="pod-backout-locked" sx={{ alignItems: 'center', minHeight: 48 }}>
        <BarNotice icon={<LockClockIcon sx={{ color: 'warning.main' }} />}>
          {t('mweb.podDetails.backoutLocked')}
        </BarNotice>
      </Stack>
    );
  }
  return (
    <Stack direction="row" spacing={1.5} data-testid="pod-backout-in-process-panel" sx={{ alignItems: 'center', pl: 1 }}>
      <BarLabel
        icon={<HourglassTopIcon sx={{ color: 'warning.main' }} />}
        caption={t('mweb.podDetails.searchingForReplacement')}
        value={t('mweb.podDetails.backoutInProcess')}
        valueTestId="pod-backout-in-process"
      />
      <DuncitButton
        variant="contained"
        onClick={onKeepSpot}
        disabled={busy}
        data-testid="pod-keep-spot"
        sx={ctaButtonSx}
      >
        {t('mweb.podDetails.keepMySpot')}
      </DuncitButton>
    </Stack>
  );
}
