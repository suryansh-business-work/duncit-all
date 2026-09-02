import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { AutoPodLabels } from '@duncit/utils';
import { MY_VENUES_FOR_AUTO_POD } from '../queries';

/** One of the owner's venues, as the queue and the accept dialog need it. */
export interface AutoPodVenueOption {
  id: string;
  venue_name: string;
  status: string;
  is_active: boolean;
  location_id: string | null;
  city: string;
  venue_category: {
    sub_category_id: string | null;
    super_category_name: string;
    category_name: string;
    sub_category_name: string;
  } | null;
}

interface MyVenues {
  myVenues: AutoPodVenueOption[];
}

/** "Sports › Racket › Badminton" — the venue's declared category. */
export function venueCategoryPath(venue: AutoPodVenueOption | null): string {
  const category = venue?.venue_category;
  if (!category) return '';
  return [category.super_category_name, category.category_name, category.sub_category_name]
    .filter(Boolean)
    .join(' › ');
}

export interface AutoPodVenuePickerProps {
  /** The venue looking at the queue; null until the list has answered. */
  value: AutoPodVenueOption | null;
  onChange: (venue: AutoPodVenueOption | null) => void;
  labels: AutoPodLabels;
  size?: 'small' | 'medium';
}

/**
 * The venue queue's own picker: which of the owner's approved venues is
 * looking. An owner may run several, and the offers shown are the ones THAT
 * venue could take — its category and its city — so the category is written
 * under the picker to say why the list is what it is. The first venue is
 * chosen on arrival; a venue with no category is offered nothing, and says so.
 * Native twin: `AutoPodVenueRow` (rule 27).
 */
export function AutoPodVenuePicker({ value, onChange, labels, size = 'small' }: Readonly<AutoPodVenuePickerProps>) {
  const { data, loading } = useQuery<MyVenues>(MY_VENUES_FOR_AUTO_POD, { fetchPolicy: 'cache-first' });
  const venues = (data?.myVenues ?? []).filter((venue) => venue.status === 'APPROVED' && venue.is_active);

  // The first venue is the default — a picker with nothing chosen would show
  // an empty queue for no reason the owner can see.
  useEffect(() => {
    if (!value && venues.length > 0) onChange(venues[0]);
  }, [value, venues, onChange]);

  if (!loading && venues.length === 0) {
    return <Alert severity="info">{labels.noVenues}</Alert>;
  }

  const path = venueCategoryPath(value);
  return (
    <Stack spacing={0.75} data-testid="auto-pod-venue-picker">
      <TextField
        select
        size={size}
        fullWidth
        label={labels.venueLabel}
        value={value?.id ?? ''}
        // The select only ever hands back an id it listed, so the venue is there.
        onChange={(event) => onChange(venues.find((venue) => venue.id === event.target.value)!)}
        disabled={loading}
      >
        {venues.map((venue) => (
          <MenuItem key={venue.id} value={venue.id}>
            {venue.venue_name}
          </MenuItem>
        ))}
      </TextField>
      {value && path && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {labels.venueCategory(path)}
        </Typography>
      )}
      {value && !path && <Alert severity="warning">{labels.noVenueCategory}</Alert>}
    </Stack>
  );
}
