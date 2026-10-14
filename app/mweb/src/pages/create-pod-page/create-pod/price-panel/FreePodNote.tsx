import { Card, Stack, Typography } from '@mui/material';
import type { FreePodVenueNotice } from '@duncit/utils';
import SectionHeader from '../../../../components/SectionHeader';
import { useTranslation } from '../../../../i18n/useTranslation';
import FreeVenueNote from '../FreeVenueNote';

interface Props {
  /** Whether the picked slot leaves the host something to settle with the venue. */
  venueNotice: FreePodVenueNotice;
}

/**
 * What Step 4 shows INSTEAD of the price field and the earnings panel when the
 * pod is free: there is nothing to calculate, so it says so in words — people
 * join without paying and Duncit collects and pays nothing — and, when the slot
 * costs something, that the venue is settled off the platform.
 * Native twin: FreePodNote (rule 27).
 */
export default function FreePodNote({ venueNotice }: Readonly<Props>) {
  const { t } = useTranslation();
  const title = t('mweb.createPod.freePodTitle');
  return (
    <Card component="section" aria-label={title} sx={{ p: 2 }} data-testid="create-pod-free-note">
      <Stack spacing={1.5}>
        <SectionHeader testId="create-pod-free-note-header" title={title} />
        <Typography variant="body2" data-testid="create-pod-free-note-body" sx={{ color: 'text.secondary' }}>
          {t('mweb.createPod.freePodBody')}
        </Typography>
        <FreeVenueNote notice={venueNotice} testId="create-pod-free-note-venue" />
      </Stack>
    </Card>
  );
}
