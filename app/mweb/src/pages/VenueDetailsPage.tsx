import { useMemo, useState } from 'react';
import { useEntityPageMeta } from '../app/pageMeta';
import { gql, useQuery } from '@apollo/client';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlaceIcon from '@mui/icons-material/Place';
import {
  Box,
  ButtonBase,
  Chip,
  CircularProgress,
  Divider,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useNavigate, useParams } from 'react-router-dom';
import MomentLightbox from '../components/moments/MomentLightbox';
import VenueMapPreview from '../components/VenueMapPreview';
import { useTranslation } from '../i18n/useTranslation';
import VenueImagesGrid from './venues-page/VenueImagesGrid';
import VenuePodsSection from './venues-page/VenuePodsSection';

const PUBLIC_VENUES = gql`
  query PublicVenueDetails {
    publicVenues {
      id
      venue_name
      venue_type
      capacity
      description
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

function VenueChipsSection({ title, items }: Readonly<{ title: string; items?: string[] | null }>) {
  if (!items?.length) return null;
  return (
    <Stack spacing={1}>
      <Typography variant="h6" sx={{
        fontWeight: 700
      }}>{title}</Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{
        flexWrap: "wrap"
      }}>
        {items.map((item) => <Chip key={item} label={item} variant="outlined" />)}
      </Stack>
    </Stack>
  );
}

const addressParts = (venue: any) => [
  venue.address_line1,
  venue.address_line2,
  venue.locality,
  venue.city,
  venue.state,
  venue.postal_code,
  venue.country,
];

export default function VenueDetailsPage() {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(PUBLIC_VENUES);
  const { t } = useTranslation();
  const [snack, setSnack] = useState('');
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  const venue = useMemo(
    () => data?.publicVenues?.find((item: any) => item.id === venueId),
    [data?.publicVenues, venueId],
  );
  useEntityPageMeta(venue?.venue_name);
  const images: string[] = useMemo(() => {
    if (!venue) return [];
    return Array.from(new Set([venue.cover_image_url, ...(venue.gallery ?? [])].filter(Boolean)));
  }, [venue]);

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
      <Stack spacing={2} sx={{ py: 4 }}>
        <DuncitButton startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ alignSelf: 'flex-start' }}>
          Back
        </DuncitButton>
        <Typography variant="h5" sx={{
          fontWeight: 700
        }}>{t('mweb.venueDetailsPage.venueNotFound')}</Typography>
        <Typography sx={{
          color: "text.secondary"
        }}>
          This venue link may be unavailable or the venue may not be approved yet.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ pb: 4 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          justifyContent: "space-between"
        }}>
        <DuncitButton startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Back</DuncitButton>
        <DuncitButton startIcon={<ContentCopyIcon />} onClick={copyLink}>{t('mweb.venueDetailsPage.copyLink')}</DuncitButton>
      </Stack>

      <Box sx={{ borderRadius: '16px', overflow: 'hidden', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
        {images[0] ? (
          <ButtonBase
            onClick={() => setZoomIndex(0)}
            focusRipple
            aria-label={t('mweb.podDetails.viewImage')}
            sx={{ display: 'block', width: '100%' }}
          >
            <Box component="img" src={images[0]} alt={venue.venue_name} sx={{ width: '100%', height: { xs: 260, sm: 360 }, objectFit: 'cover', display: 'block' }} />
          </ButtonBase>
        ) : (
          <Box sx={{ minHeight: 220, display: 'grid', placeItems: 'center', px: 3, bgcolor: 'action.hover' }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 600,
                textAlign: "center"
              }}>{venue.venue_name}</Typography>
          </Box>
        )}
      </Box>

      <Stack spacing={1}>
        <Typography variant="h4" sx={{
          fontWeight: 600
        }}>{venue.venue_name}</Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{
          flexWrap: "wrap"
        }}>
          <Chip label={venue.venue_type} />
          <Chip label={`${venue.capacity} capacity`} />
          {venue.tags?.map((tag: string) => <Chip key={tag} label={tag} variant="outlined" />)}
        </Stack>
      </Stack>

      {venue.description && <Typography sx={{
        color: "text.secondary"
      }}>{venue.description}</Typography>}

      <Divider />

      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <PlaceIcon color="primary" fontSize="small" />
          <Typography variant="h6" sx={{
            fontWeight: 700
          }}>{t('mweb.common.location')}</Typography>
        </Stack>
        <Typography sx={{
          color: "text.secondary"
        }}>
          {addressParts(venue).map((part) => part?.trim()).filter(Boolean).join(', ')}
        </Typography>
        <VenueMapPreview title={venue.venue_name} parts={addressParts(venue)} lat={venue.lat} lng={venue.lng} />
      </Stack>

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

      <Snackbar open={!!snack} autoHideDuration={2200} message={snack} onClose={() => setSnack('')} />
    </Stack>
  );
}
