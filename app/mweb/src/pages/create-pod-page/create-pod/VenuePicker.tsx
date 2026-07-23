import { Box, Card, CardActionArea, Chip, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { requiredLabel } from '../../../forms/components/requiredLabel';
import type { CreatePodVenue } from './create-pod.types';

interface Props {
  venues: CreatePodVenue[];
  selectedId: string;
  onSelect: (id: string) => void;
  required?: boolean;
}

/** Step 3 venue picker — approved partner venues in the pod's city as a
 * horizontal card rail; tapping a card selects it (and clears the old slot). */
export default function VenuePicker({ venues, selectedId, onSelect, required }: Readonly<Props>) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={800}>
        {requiredLabel('Select venue', required)}
      </Typography>
      <Stack direction="row" sx={{ mt: 1, gap: 1.25, overflowX: 'auto', pb: 1, scrollSnapType: 'x mandatory' }}>
        {venues.map((venue) => {
          const selected = venue.id === selectedId;
          const locality = [venue.locality, venue.city].filter(Boolean).join(', ');
          return (
            <Card
              key={venue.id}
              variant="outlined"
              sx={{
                minWidth: 236,
                maxWidth: 260,
                flex: '0 0 auto',
                scrollSnapAlign: 'start',
                borderColor: selected ? 'primary.main' : 'divider',
                borderWidth: selected ? 2 : 1,
              }}
            >
              <CardActionArea
                onClick={() => onSelect(venue.id)}
                aria-label={venue.venue_name}
                aria-pressed={selected}
                sx={{ p: 1.25 }}
              >
                <Box
                  sx={{
                    height: 96,
                    borderRadius: 1.5,
                    mb: 1,
                    bgcolor: 'action.hover',
                    backgroundImage: venue.cover_image_url ? `url(${venue.cover_image_url})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="subtitle2" fontWeight={900} noWrap sx={{ flex: 1 }}>
                    {venue.venue_name}
                  </Typography>
                  {selected && <CheckCircleIcon color="primary" fontSize="small" />}
                </Stack>
                {locality && (
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary', mt: 0.25 }}>
                    <PlaceOutlinedIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption" noWrap>{locality}</Typography>
                  </Stack>
                )}
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                  {venue.venue_type && <Chip size="small" label={venue.venue_type} variant="outlined" />}
                  {typeof venue.capacity === 'number' && venue.capacity > 0 && (
                    <Chip size="small" label={`Up to ${venue.capacity}`} variant="outlined" />
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
