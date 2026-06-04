import { Box, Typography } from '@mui/material';
import LocationCityCard from './LocationCityCard';
import type { LocationLike } from '../../utils/location-tree';

interface Props {
  cities: LocationLike[];
  draftLocationId: string;
  onSelect: (id: string) => void;
}

export default function LocationCityGrid({ cities, draftLocationId, onSelect }: Props) {
  const popularId = cities.reduce<LocationLike | null>((best, loc) => {
    if (!best) return loc;
    return (loc.location_zones?.length ?? 0) > (best.location_zones?.length ?? 0) ? loc : best;
  }, null)?.id;

  return (
    <>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900, lineHeight: 1.4 }}>
        City
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: { xs: 'minmax(94px, 32%)', sm: 'minmax(126px, 1fr)' },
          gap: 1,
          mt: 0.5,
          mb: 1.5,
          pb: 0.5,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {cities.map((city, index) => {
          const active = city.id === draftLocationId;
          return (
            <LocationCityCard
              key={city.id}
              location={city}
              active={active}
              popular={!active && city.id === popularId}
              index={index}
              onSelect={() => onSelect(city.id)}
            />
          );
        })}
        {cities.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No cities here yet.
          </Typography>
        )}
      </Box>
    </>
  );
}
