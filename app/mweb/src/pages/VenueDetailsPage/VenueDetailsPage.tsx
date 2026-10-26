import { useMemo, useState } from 'react';
import { useEntityPageMeta } from '../../app/pageMeta';
import { useQuery } from '@apollo/client/react';
import ContentCopyIcon from '@mui/icons-material/ContentCopyRounded';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineRounded';
import {
  Chip,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitIconButton } from '@duncit/buttons';
import { venueImages } from '@duncit/utils';
import { useNavigate, useParams } from 'react-router';
import MomentLightbox from '../../components/moments/MomentLightbox';
import EmptyState from '../../components/EmptyState';
import PublicReelsSection from '../../components/public-page/PublicReelsSection';
import PageHeader from '../../components/PageHeader';
import TwoToneHeading from '../../components/TwoToneHeading';
import { useTranslation } from '../../i18n/useTranslation';
import VenueImagesGrid from '../venues-page/VenueImagesGrid';
import VenuePodsSection from '../venues-page/VenuePodsSection';
import { VENUE_CHIP_SX, VenueChipsSection, VenueLocationCard } from '../venues-page/VenueInfoSections';
import LocationMismatchDialog from '../../components/LocationMismatchDialog';
import { useLocationMismatch } from '../../hooks/useLocationMismatch';
import VenueFoodTabs from './food/VenueFoodTabs';
import { PUBLIC_VENUE, type PublicVenue } from './queries';
import { ROUND_BTN_SX, addressParts } from './venueDetailsHelpers';
import VenueHero from './VenueHero';

export default function VenueDetailsPage() {
  const { venueId = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery<{ publicVenue: PublicVenue | null }>(PUBLIC_VENUE, {
    variables: { venueId },
    skip: !venueId,
  });
  const { t } = useTranslation();
  const [snack, setSnack] = useState('');
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  const venue = data?.publicVenue ?? null;
  useEntityPageMeta(venue?.venue_name);
  const images: string[] = useMemo(() => venueImages(venue), [venue]);
  const locationPrompt = useLocationMismatch(
    venue ? { id: venue.location_id, zone: venue.locality } : null,
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(globalThis.window.location.href);
      setSnack(t('mweb.venueDetailsPage.linkCopied'));
    } catch {
      setSnack(t('mweb.venueDetailsPage.copyUnavailable'));
    }
  };

  if (loading && !data) {
    return (
      <CircularProgress aria-label={t('mweb.a11y.loading')}
        data-testid="venue-details-loading"
        sx={{ display: 'block', mx: 'auto', my: 6 }}
      />
    );
  }

  if (error) {
    return (
      <Stack spacing={2} sx={{ py: 2 }} data-testid="venue-details-error">
        <EmptyState
          testId="venue-details-load-failed"
          icon={<ErrorOutlineIcon />}
          title={t('publicPage.hostPage.loadFailed')}
          actionLabel={t('publicPage.hostPage.retry')}
          onAction={() => {
            // A failed retry re-renders this state through `error` itself.
            refetch().catch(() => undefined);
          }}
        />
      </Stack>
    );
  }

  if (!venue) {
    return (
      <Stack spacing={2} sx={{ py: 2 }} data-testid="venue-details-missing">
        <PageHeader testId="venue-details-header" title={t('mweb.venueDetailsPage.venueNotFound')} onBack={() => navigate(-1)} />
        <EmptyState
          testId="venue-details-empty"
          icon={<StorefrontIcon />}
          title={t('mweb.venueDetailsPage.venueUnavailable')}
        />
      </Stack>
    );
  }

  const copyButton = (
    <DuncitIconButton
      aria-label={t('mweb.venueDetailsPage.copyLink')}
      title={t('mweb.venueDetailsPage.copyLink')}
      onClick={copyLink}
      sx={ROUND_BTN_SX}
      data-testid="venue-details-copy"
    >
      <ContentCopyIcon fontSize="small" />
    </DuncitIconButton>
  );

  const events = [
    <VenuePodsSection key="pods" venueId={venue.id} venueName={venue.venue_name} />,
    <PublicReelsSection key="reels" venueId={venue.id} />,
  ];

  return (
    <Stack spacing={2.5} sx={{ pb: 4 }} data-testid="venue-details-screen">
      <PageHeader testId="venue-details-header" title={venue.venue_name} onBack={() => navigate(-1)} right={copyButton} />

      <VenueHero images={images} venueName={venue.venue_name} onOpen={setZoomIndex} />

      <Stack spacing={1.25}>
        {/* eslint-disable-next-line jsx-a11y/heading-has-content -- false positive: TwoToneHeading renders its lead prop as the heading text */}
        <TwoToneHeading lead={venue.venue_name} component="h2" />
        <Stack direction="row" spacing={1} useFlexGap sx={{
          flexWrap: "wrap"
        }}>
          <Chip label={venue.venue_type} sx={VENUE_CHIP_SX} />
          <Chip label={t('mweb.venues.capacity', { vars: { capacity: venue.capacity } })} sx={VENUE_CHIP_SX} />
          {venue.tags?.map((tag) => <Chip key={tag} label={tag} sx={VENUE_CHIP_SX} />)}
        </Stack>
        {venue.description && <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>{venue.description}</Typography>}
      </Stack>

      {/* A venue that serves food opens on its menu, with its pods under Events;
          every other venue keeps the page it always had. */}
      {venue.offers_food && <VenueFoodTabs venue={venue} events={events} onRefresh={refetch} />}

      <VenueLocationCard
        title={t('mweb.common.location')}
        venueName={venue.venue_name}
        parts={addressParts(venue)}
        lat={venue.lat}
        lng={venue.lng}
      />

      {!venue.offers_food && events}

      <VenueChipsSection title={t('mweb.common.amenities')} items={venue.amenities} />
      <VenueChipsSection title={t('mweb.common.facilities')} items={venue.facilities} />
      <VenueChipsSection title={t('mweb.common.venueSecurity')} items={venue.security} />

      <VenueImagesGrid images={images} venueName={venue.venue_name} onOpen={setZoomIndex} videos={venue.videos} />

      <MomentLightbox
        moments={images.map((url) => ({ url }))}
        index={zoomIndex}
        onClose={() => setZoomIndex(null)}
        onIndexChange={setZoomIndex}
      />

      <LocationMismatchDialog kind="VENUE" {...locationPrompt} />
      <Snackbar open={!!snack} autoHideDuration={2200} message={snack} onClose={() => setSnack('')} />
    </Stack>
  );
}
