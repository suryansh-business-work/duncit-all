import { Divider, Grid, Stack, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { RhfTextField } from '@duncit/forms';
import { RhfAdminLocation } from '@duncit/location';
import { useTranslation } from '@duncit/shell';
import { VideoLinksField } from '@duncit/venue-food';
import { Controller, useWatch, type Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import GalleryField from '../fields/GalleryField';
import MediaUrlField from '../fields/MediaUrlField';
import VenueCategoriesField from '../fields/VenueCategoriesField';
import type { VenueFormValues } from '../types';
import { sectionAnchor } from './venue-editor-sections';

/**
 * Venue Details — what the place is called, how it looks, what it hosts and
 * where it is. The same section, in the same order, as the owner's form: name,
 * description, cover and gallery, categories, then the address.
 *
 * The city comes strictly from the admin Location list rather than free text:
 * a club auto-matches its venues by `location_id`, so a hand-typed city name
 * would put a real venue outside every club that should have found it.
 */
export default function VenueDetailsSection({
  control,
  onPick,
  categoryLimit,
  minCategories,
  venueId,
  videoLimit,
}: Readonly<{
  control: Control<VenueFormValues>;
  onPick: (folder?: string) => Promise<string | null>;
  /** The most categories one venue may have, from the registration config. */
  categoryLimit: number;
  /** How many category rows must stay — see `VenueCategoriesField`. */
  minCategories: number;
  /** The venue being edited — its videos are filed in its folder; '' while it is being created. */
  venueId: string;
  /** The most videos the venue page may carry, from the registration config. */
  videoLimit: number;
}>) {
  const { t } = useTranslation();
  // The upload button names whose videos these are; a venue not yet named falls back to the section.
  const venueName = useWatch({ control, name: 'venue_name' });

  return (
    <SectionCard
      id={sectionAnchor('details')}
      icon={<StorefrontIcon color="primary" />}
      title={t('directory.venueEditor.sectionDetails')}
    >
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="venue_name"
          label={t('directory.venueEditor.venueName')}
          size="small"
          required
          data-testid="venue-editor-name"
        />
        <RhfTextField
          control={control}
          name="description"
          label={t('directory.venueEditor.description')}
          size="small"
          multiline
          minRows={3}
        />

        <Divider />
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t('directory.venueEditor.media')}
        </Typography>
        <MediaUrlField
          control={control}
          name="cover_image_url"
          label={t('directory.venueEditor.coverImage')}
          hint={t('directory.venueEditor.coverImageHint')}
          onPick={() => onPick('/venues')}
          pickLabel={t('directory.venueEditor.upload')}
        />
        <GalleryField control={control} onPick={() => onPick('/venues')} />
        <Controller
          control={control}
          name="videos"
          render={({ field, fieldState }) => (
            <VideoLinksField
              videos={field.value}
              onChange={field.onChange}
              limit={videoLimit}
              name={venueName.trim() || t('directory.venueEditor.media')}
              venueId={venueId || undefined}
              surface="PORTALS"
              testId="venue-editor-videos"
              error={fieldState.error?.message}
            />
          )}
        />

        <Divider />
        <VenueCategoriesField control={control} limit={categoryLimit} min={minCategories} />

        <Divider />
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t('directory.venueEditor.location')}
        </Typography>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <RhfTextField
              control={control}
              name="address_line1"
              label={t('directory.venueEditor.addressLine1')}
              size="small"
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <RhfTextField
              control={control}
              name="address_line2"
              label={t('directory.venueEditor.addressLine2')}
              size="small"
            />
          </Grid>
        </Grid>
        <RhfAdminLocation
          control={control}
          name="location"
          required
          direction="row"
          legend={t('directory.venueEditor.cityAndArea')}
          hint={t('directory.venueEditor.locationHint')}
        />
      </Stack>
    </SectionCard>
  );
}
