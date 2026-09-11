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
      <Stack direction="row" sx={{ alignItems: 'center', minHeight: 48 }}>
        <BarNotice icon={<LockClockIcon sx={{ color: 'warning.main' }} />}>
          {t('mweb.podDetails.backoutLocked')}
        </BarNotice>
      </Stack>
    );
  }
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', pl: 1 }}>
      <BarLabel
        icon={<HourglassTopIcon sx={{ color: 'warning.main' }} />}
        caption={t('mweb.podDetails.searchingForReplacement')}
        value={t('mweb.podDetails.backoutInProcess')}
      />
      <DuncitButton variant="contained" onClick={onKeepSpot} disabled={busy} sx={ctaButtonSx}>
        {t('mweb.podDetails.keepMySpot')}
      </DuncitButton>
    </Stack>
  );
}
