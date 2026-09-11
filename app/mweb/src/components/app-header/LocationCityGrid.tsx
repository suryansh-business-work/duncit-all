import { Box, Typography } from '@mui/material';
import LocationCityCard from './LocationCityCard';
import LocationSectionLabel from './LocationSectionLabel';
import type { LocationLike } from '../../utils/location-tree';

interface Props {
  cities: LocationLike[];
  draftLocationId: string;
  onSelect: (id: string) => void;
}

export default function LocationCityGrid({ cities, draftLocationId, onSelect }: Readonly<Props>) {
  return (
    <Box>
      <LocationSectionLabel>City</LocationSectionLabel>
      <Box
        sx={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: '110px',
          gap: 1,
          pb: 0.5,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {cities.map((city) => (
          <LocationCityCard
            key={city.id}
            location={city}
            active={city.id === draftLocationId}
            onSelect={() => onSelect(city.id)}
          />
        ))}
        {cities.length === 0 && (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            No cities here yet.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
