import { useMemo, useState } from 'react';
import { useEntityPageMeta } from '../app/pageMeta';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import ContentCopyIcon from '@mui/icons-material/ContentCopyRounded';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import {
  Box,
  ButtonBase,
  Chip,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitIconButton } from '@duncit/buttons';
import { venueImages } from '@duncit/utils';
import { useNavigate, useParams } from 'react-router';
import MomentLightbox from '../components/moments/MomentLightbox';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import TwoToneHeading from '../components/TwoToneHeading';
import { useTranslation } from '../i18n/useTranslation';
import VenueImagesGrid from './venues-page/VenueImagesGrid';
import VenuePodsSection from './venues-page/VenuePodsSection';
import { VENUE_CHIP_SX, VenueChipsSection, VenueLocationCard } from './venues-page/VenueInfoSections';
import LocationMismatchDialog from '../components/LocationMismatchDialog';
import { useLocationMismatch } from '../hooks/useLocationMismatch';

const PUBLIC_VENUES = gql`
  query PublicVenueDetails {
    publicVenues {
      id
      venue_name
      venue_type
      capacity
      description
      location_id
      amenities
      facilities
      security
      cover_image_url
      gallery
      address_line1
      address_line2
      city
      state
      locality
      postal_code
      country
      lat
      lng
      tags
    }
  }
`;

const addressParts = (venue: any) => [
  venue.address_line1,
  venue.address_line2,
  venue.locality,
  venue.city,
  venue.state,
  venue.postal_code,
  venue.country,
];

/** The round 40px surface action on the header's right. */
const ROUND_BTN_SX = {
  width: 40,
  height: 40,
  minHeight: 40,
  bgcolor: 'background.paper',
  color: 'text.primary',
  border: '1px solid var(--duncit-card-border)',
} as const;

/** Hero inside the page padding with the calm 24px corners (native twin). */
const HERO_SX = { width: '100%', height: { xs: 240, sm: 360 }, borderRadius: '24px', overflow: 'hidden' } as const;

export default function VenueDetailsPage() {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<any>(PUBLIC_VENUES);
  const { t } = useTranslation();
  const [snack, setSnack] = useState('');
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  const venue = useMemo(
    () => data?.publicVenues?.find((item: any) => item.id === venueId),
    [data?.publicVenues, venueId],
  );
  useEntityPageMeta(venue?.venue_name);
  const images: string[] = useMemo(() => venueImages(venue), [venue]);
  const locationPrompt = useLocationMismatch(
    venue ? { id: venue.location_id, zone: venue.locality } : null,
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(globalThis.window.location.href);
      setSnack('Venue link copied');
    } catch {
      setSnack('Copy is unavailable in this browser');
    }
  };

  if (loading && !data) {
    return <CircularProgress sx={{ display: 'block', mx: 'auto', my: 6 }} />;
  }

  if (error || !venue) {
    return (
      <Stack spacing={2} sx={{ py: 2 }}>
        <PageHeader title={t('mweb.venueDetailsPage.venueNotFound')} onBack={() => navigate(-1)} />
        <EmptyState
          icon={<StorefrontIcon />}
          title="This venue link may be unavailable or the venue may not be approved yet."
        />
      </Stack>
    );
  }

  const copyButton = (
    <DuncitIconButton aria-label={t('mweb.venueDetailsPage.copyLink')} title={t('mweb.venueDetailsPage.copyLink')} onClick={copyLink} sx={ROUND_BTN_SX}>
      <ContentCopyIcon fontSize="small" />
    </DuncitIconButton>
  );

  return (
    <Stack spacing={2.5} sx={{ pb: 4 }}>
      <PageHeader title={venue.venue_name} onBack={() => navigate(-1)} right={copyButton} />

      {images[0] ? (
        <ButtonBase
          onClick={() => setZoomIndex(0)}
          focusRipple
          aria-label={t('mweb.podDetails.viewImage')}
          sx={{ ...HERO_SX, display: 'block' }}
        >
          <Box component="img" src={images[0]} alt={venue.venue_name} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </ButtonBase>
      ) : (
        <Box sx={{ ...HERO_SX, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'secondary.main' }}>
          <StorefrontIcon sx={{ fontSize: 44 }} />
        </Box>
      )}

      <Stack spacing={1.25}>
        <TwoToneHeading lead={venue.venue_name} component="h2" />
        <Stack direction="row" spacing={1} useFlexGap sx={{
          flexWrap: "wrap"
        }}>
          <Chip label={venue.venue_type} sx={VENUE_CHIP_SX} />
          <Chip label={`${venue.capacity} capacity`} sx={VENUE_CHIP_SX} />
          {venue.tags?.map((tag: string) => <Chip key={tag} label={tag} sx={VENUE_CHIP_SX} />)}
        </Stack>
        {venue.description && <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>{venue.description}</Typography>}
      </Stack>

      <VenueLocationCard
        title={t('mweb.common.location')}
        venueName={venue.venue_name}
        parts={addressParts(venue)}
        lat={venue.lat}
        lng={venue.lng}
      />

      <VenuePodsSection venueId={venue.id} />

      <VenueChipsSection title={t('mweb.common.amenities')} items={venue.amenities} />
      <VenueChipsSection title={t('mweb.common.facilities')} items={venue.facilities} />
      <VenueChipsSection title={t('mweb.common.venueSecurity')} items={venue.security} />

      <VenueImagesGrid images={images} venueName={venue.venue_name} onOpen={setZoomIndex} />

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
