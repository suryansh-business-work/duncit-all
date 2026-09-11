import { Stack } from '@mui/material';
import CollectionsIcon from '@mui/icons-material/Collections';
import { useTranslation } from '@duncit/shell';
import type { Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import MediaUrlField from '../fields/MediaUrlField';
import GalleryField from '../fields/GalleryField';
import type { VenueFormValues } from '../types';

/** The cover a member sees first, and the gallery behind it. */
export default function MediaSection({
  control,
  onPick,
}: Readonly<{
  control: Control<VenueFormValues>;
  onPick: (folder?: string) => Promise<string | null>;
}>) {
  const { t } = useTranslation();

  return (
    <SectionCard icon={<CollectionsIcon color="primary" />} title={t('directory.venueEditor.media')}>
      <Stack spacing={1.5}>
        <MediaUrlField
          control={control}
          name="cover_image_url"
          label={t('directory.venueEditor.coverImage')}
          hint={t('directory.venueEditor.coverImageHint')}
          onPick={() => onPick('/venues')}
          pickLabel={t('directory.venueEditor.upload')}
        />
        <GalleryField control={control} onPick={() => onPick('/venues')} />
      </Stack>
    </SectionCard>
  );
}
