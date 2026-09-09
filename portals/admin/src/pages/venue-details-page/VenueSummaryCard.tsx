import { Box, Card, CardContent, Chip, Divider, Link, Stack, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import GroupsIcon from '@mui/icons-material/Groups';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import PercentIcon from '@mui/icons-material/Percent';
import PaymentsIcon from '@mui/icons-material/Payments';
import { StatCard, StatusChip, type StatusColorMap } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import type { AdminVenueDetail } from './queries';
import { categoryPath, locationLine } from './venue-values';

const STATUS_COLOR: StatusColorMap = {
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

/** Google Maps is the one place an admin checks a venue's pin against the
 * address the owner typed, so the coordinates are a link rather than a label. */
const mapsHref = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/** The header card: what the venue is, where it is, and the four numbers an
 * admin scans before opening a tab. */
export default function VenueSummaryCard({ venue }: Readonly<{ venue: AdminVenueDetail }>) {
  const { t } = useTranslation();
  const place = locationLine(venue);
  const category = categoryPath(venue.venue_category);
  const hasPin = typeof venue.lat === 'number' && typeof venue.lng === 'number';

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
          <Box
            component="img"
            src={venue.cover_image_url || '/duncit-logo.svg'}
            alt={venue.venue_name}
            sx={{
              width: { xs: '100%', sm: 168 },
              height: 168,
              borderRadius: 2,
              objectFit: 'cover',
              bgcolor: 'action.hover',
              flex: '0 0 auto',
            }}
          />
          <Stack spacing={1.25} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusChip status={venue.status} colorMap={STATUS_COLOR} sx={{ fontWeight: 800 }} />
              <Chip
                size="small"
                variant="outlined"
                color={venue.is_active ? 'success' : 'default'}
                label={venue.is_active ? t('admin.profile.active') : t('admin.profile.inactive')}
              />
              {venue.venue_type && <Chip size="small" variant="outlined" label={venue.venue_type} />}
              {venue.venue_no && <Chip size="small" variant="outlined" label={venue.venue_no} />}
            </Stack>

            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start', color: 'text.secondary' }}>
              <PlaceIcon fontSize="small" sx={{ mt: 0.25 }} />
              <Typography variant="body2">{place || t('admin.venueDetails.locationUnset')}</Typography>
            </Stack>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {category}
            </Typography>

            {hasPin && (
              <Link
                href={mapsHref(venue.lat as number, venue.lng as number)}
                target="_blank"
                rel="noreferrer"
                variant="caption"
                sx={{ fontWeight: 700 }}
              >
                {t('admin.venueDetails.openInMaps')}
              </Link>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          }}
        >
          <StatCard
            layout="valueFirst"
            icon={<GroupsIcon fontSize="small" />}
            label={t('admin.venueDetails.statPods')}
            value={venue.pod_count}
          />
          <StatCard
            layout="valueFirst"
            icon={<EventSeatIcon fontSize="small" />}
            label={t('admin.venueDetails.statCapacity')}
            value={venue.capacity}
          />
          <StatCard
            layout="valueFirst"
            icon={<PaymentsIcon fontSize="small" />}
            label={t('admin.venueDetails.statShare')}
            value={`${venue.venue_share_pct}%`}
          />
          <StatCard
            layout="valueFirst"
            icon={<PercentIcon fontSize="small" />}
            label={t('admin.venueDetails.statCommission')}
            value={`${venue.venue_commission_pct}%`}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
