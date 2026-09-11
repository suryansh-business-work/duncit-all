import { Box, Card, CardActionArea, Chip, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { requiredLabel } from '../../../forms/components/requiredLabel';
import { useTranslation } from '../../../i18n/useTranslation';
import type { CreatePodVenue } from './create-pod.types';

/** A small info pill inside a venue card (type, capacity). */
const INFO_CHIP_SX = { height: 26, minHeight: 26, fontSize: '0.75rem' } as const;

interface Props {
  venues: CreatePodVenue[];
  selectedId: string;
  onSelect: (id: string) => void;
  required?: boolean;
}

/** Step 3 venue picker — approved partner venues in the pod's city as a
 * horizontal rail of 24px cards (18px media); the picked one carries a 2px
 * green ring. Tapping a card selects it (and clears the old slot). */
export default function VenuePicker({ venues, selectedId, onSelect, required }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const ring = `inset 0 0 0 2px ${theme.palette.primary.main}`;
  return (
    <Box>
      <Typography variant="subtitle2" component="div">
        {requiredLabel(t('mweb.createPod.selectVenue'), required)}
      </Typography>
      <Stack direction="row" sx={{ mt: 1, gap: 1.5, overflowX: 'auto', pb: 1, scrollSnapType: 'x mandatory' }}>
        {venues.map((venue) => {
          const selected = venue.id === selectedId;
          const locality = [venue.locality, venue.city].filter(Boolean).join(', ');
          return (
            <Card
              key={venue.id}
              sx={{
                minWidth: 236,
                maxWidth: 260,
                flex: '0 0 auto',
                scrollSnapAlign: 'start',
                boxShadow: selected ? ring : undefined,
              }}
            >
              <CardActionArea
                onClick={() => onSelect(venue.id)}
                aria-label={venue.venue_name}
                aria-pressed={selected}
                sx={{ p: 1.5 }}
              >
                <Box
                  sx={{
                    height: 96,
                    borderRadius: '18px',
                    mb: 1,
                    bgcolor: 'action.hover',
                    backgroundImage: venue.cover_image_url ? `url(${venue.cover_image_url})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <Typography noWrap sx={{ fontSize: '0.95rem', fontWeight: 600, flex: 1 }}>
                    {venue.venue_name}
                  </Typography>
                  {selected && <CheckCircleIcon color="primary" fontSize="small" />}
                </Stack>
                {locality && (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                      alignItems: "center",
                      color: 'text.secondary',
                      mt: 0.25
                    }}>
                    <PlaceOutlinedIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption" noWrap>{locality}</Typography>
                  </Stack>
                )}
                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}>
                  {venue.venue_type && <Chip size="small" label={venue.venue_type} sx={INFO_CHIP_SX} />}
                  {typeof venue.capacity === 'number' && venue.capacity > 0 && (
                    <Chip
                      size="small"
                      label={t('mweb.createPod.upTo', { vars: { capacity: venue.capacity } })}
                      sx={INFO_CHIP_SX}
                    />
                  )}
                </Stack>
              </CardActionArea>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
