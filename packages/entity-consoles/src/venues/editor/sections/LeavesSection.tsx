import { Stack, Typography } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { useTranslation } from '@duncit/shell';
import type { Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import HolidaysField from '../fields/HolidaysField';
import type { VenueFormValues } from '../types';
import { sectionAnchor } from './venue-editor-sections';

/**
 * Leaves & Holidays — the dates the venue stays closed. Its own section, as on
 * the owner's form.
 *
 * Unlike the owner's form, which saves these on their own, they ride on this
 * page's one Save: they are written through the same `updateVenueSettings`
 * mutation as the rest of the venue's operating settings.
 */
export default function LeavesSection({
  control,
}: Readonly<{ control: Control<VenueFormValues> }>) {
  const { t } = useTranslation();

  return (
    <SectionCard
      id={sectionAnchor('leaves')}
      icon={<EventBusyIcon color="primary" />}
      title={t('directory.venueEditor.sectionLeaves')}
    >
      <Stack spacing={1.5}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('directory.venueEditor.leavesHint')}
        </Typography>
        <HolidaysField control={control} />
      </Stack>
    </SectionCard>
  );
}
