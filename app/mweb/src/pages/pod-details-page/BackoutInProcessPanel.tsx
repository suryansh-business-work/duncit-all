import { Alert, Button, Stack, Typography } from '@mui/material';
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
 * restored via "Keep My Spot" until the seat is rebooked.
 */
export default function BackoutInProcessPanel({ canCancel, busy, onKeepSpot }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!canCancel) {
    return <Alert severity="info">{t('mweb.podDetails.backoutLocked')}</Alert>;
  }
  return (
    <Stack spacing={1}>
      <Alert severity="warning">
        <b>{t('mweb.podDetails.backoutInProcessLead')}</b>{' '}
        {t('mweb.podDetails.backoutSearchingNote')}
      </Alert>
      <Button variant="contained" onClick={onKeepSpot} disabled={busy} sx={{ fontWeight: 700 }}>
        {t('mweb.podDetails.keepMySpot')}
      </Button>
      <Typography variant="caption" color="text.secondary">
        {t('mweb.podDetails.changedYourMind')}
      </Typography>
    </Stack>
  );
}
