import { Box, Chip, Stack, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import SectionHeader from '../../components/SectionHeader';
import VenueMapPreview from '../../components/VenueMapPreview';
import { SURFACE_SX } from '../../theme';

/** A soft pill on a surface card — venue type, capacity, tags, amenities. */
export const VENUE_CHIP_SX = { fontWeight: 600 } as const;

/** Amenities / Facilities / Security: a surface card of soft pills. Native
 * twin: the ChipsGroup in VenueDetailsScreen. */
export function VenueChipsSection({ title, items }: Readonly<{ title: string; items?: string[] | null }>) {
  if (!items?.length) return null;
  return (
    <Stack spacing={1.5} sx={{ ...SURFACE_SX, p: 2 }}>
      <SectionHeader title={title} />
      <Stack direction="row" spacing={1} useFlexGap sx={{
        flexWrap: "wrap"
      }}>
        {items.map((item) => <Chip key={item} label={item} sx={VENUE_CHIP_SX} />)}
      </Stack>
    </Stack>
  );
}

interface LocationProps {
  title: string;
  venueName: string;
  parts: Array<string | null | undefined>;
  lat?: number | null;
  lng?: number | null;
}

/** The venue's address on a surface card: a place icon on a soft disc, the
 * address, and the map preview under it. */
export function VenueLocationCard({ title, venueName, parts, lat, lng }: Readonly<LocationProps>) {
  return (
    <Stack spacing={1.5} sx={{ ...SURFACE_SX, p: 2 }}>
      <SectionHeader title={title} />
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            flex: '0 0 auto',
            borderRadius: '50%',
            bgcolor: 'action.hover',
            color: 'secondary.main',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <PlaceIcon fontSize="small" />
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {parts.map((part) => part?.trim()).filter(Boolean).join(', ')}
        </Typography>
      </Stack>
      <VenueMapPreview title={venueName} parts={parts} lat={lat} lng={lng} />
    </Stack>
  );
}
