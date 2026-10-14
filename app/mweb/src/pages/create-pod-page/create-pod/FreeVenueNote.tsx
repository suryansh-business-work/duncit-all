import { Alert, Stack, Typography } from '@mui/material';
import type { FreePodVenueNotice } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  /** `freePodVenueNotice` from @duncit/utils — the one rule both apps read. */
  notice: FreePodVenueNotice;
  testId?: string;
}

/**
 * A free pod on a slot the venue charges for: Duncit pays the venue nothing, so
 * the host settles with the venue directly. Shown on the venue step and again
 * before publishing; draws nothing when there is nothing to settle. The second
 * line is dropped once a Pod Request has already confirmed the slot.
 * Native twin: FreeVenueNote (rule 27).
 */
export default function FreeVenueNote({ notice, testId = 'create-pod-free-venue-note' }: Readonly<Props>) {
  const { t } = useTranslation();
  if (notice === 'NONE') return null;
  return (
    <Alert data-testid={testId} severity="info" role="status">
      <Stack spacing={0.5}>
        <Typography variant="body2">{t('mweb.createPod.freeVenueSettle')}</Typography>
        {notice === 'SETTLE_BEFORE_APPROVAL' && (
          <Typography variant="body2">{t('mweb.createPod.freeVenueHold')}</Typography>
        )}
      </Stack>
    </Alert>
  );
}
