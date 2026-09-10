import { Box, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ChipList, InfoRow } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import SectionCard from './SectionCard';
import { categoryPath, EMPTY } from './venue-values';
import type { AdminVenueDetail } from './queries';

/** What the venue offers: the owner's own words, the taxonomy it was filed
 * under, its named spaces, and the three amenity lists. */
export default function VenueAboutCard({ venue }: Readonly<{ venue: AdminVenueDetail }>) {
  const { t } = useTranslation();
  const spaces = venue.capacity_items ?? [];

  return (
    <SectionCard icon={<InfoOutlinedIcon color="primary" />} title={t('admin.venueDetails.about')}>
      <Typography
        variant="body2"
        sx={{ whiteSpace: 'pre-wrap', mb: 2, color: venue.description ? 'text.primary' : 'text.secondary' }}
      >
        {venue.description || t('admin.venueDetails.noDescription')}
      </Typography>

      <Stack spacing={1.5}>
        <InfoRow label={t('admin.venueDetails.category')} value={categoryPath(venue.venue_category)} />

        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>
            {t('admin.venueDetails.spaces')}
          </Typography>
          {spaces.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('admin.venueDetails.noSpaces')}
            </Typography>
          ) : (
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {spaces.map((s) => (
                <InfoRow key={s.label} variant="split" label={s.label} value={s.capacity} />
              ))}
            </Stack>
          )}
        </Box>

        <InfoRow
          label={t('admin.venueDetails.amenities')}
          value={<ChipList items={venue.amenities ?? []} empty={EMPTY} />}
        />
        <InfoRow
          label={t('admin.venueDetails.facilities')}
          value={<ChipList items={venue.facilities ?? []} empty={EMPTY} />}
        />
        <InfoRow
          label={t('admin.venueDetails.security')}
          value={<ChipList items={venue.security ?? []} empty={EMPTY} />}
        />
        <InfoRow
          label={t('admin.venueDetails.tags')}
          value={<ChipList items={venue.tags ?? []} empty={EMPTY} />}
        />
      </Stack>
    </SectionCard>
  );
}
