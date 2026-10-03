import { Box } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';

/** "Who Even Are We? | (pin) Gomti Nagar, Lucknow" — the club and where it
 * runs. The pin is an icon, not a glyph (rule 31). Shared by the Club filter
 * options and the All Pods Club column. */
export default function ClubLocationLabel({ name, location }: Readonly<{ name: string; location: string }>) {
  if (!location) return <>{name}</>;
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      {name}
      {' | '}
      <PlaceIcon fontSize="inherit" aria-hidden />
      {location}
    </Box>
  );
}
