import { Box, Stack, Typography } from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';

import { STORE_TOKENS as T } from '../../theme/tokens';
import { useOccasion } from './occasionContext';

/** One end of the ribbon: the occasion's ornament colour, never under text. */
function Ornament() {
  return (
    <Box aria-hidden sx={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', bgcolor: T.surface, flexShrink: 0 }}>
      <AutoAwesomeRoundedIcon sx={{ color: T.festive, fontSize: 24 }} />
    </Box>
  );
}

/**
 * The occasion's festive line over the home page's first section. The text is
 * ink on the brand tint (the pairing every look guarantees); the festive colour
 * only paints the ornaments and the edge stripes.
 */
export function GreetingRibbon() {
  const { greeting } = useOccasion();
  if (!greeting) return null;
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: T.brandTint,
        color: T.ink,
        borderRadius: `${T.radius.card}px`,
        borderLeft: 6,
        borderRight: 6,
        borderColor: T.festive,
        px: { xs: 1.5, md: 3 },
        py: 1.25,
        boxShadow: T.shadow,
      }}
    >
      <Ornament />
      <Typography component="p" sx={{ fontWeight: 800, fontSize: { xs: '1rem', md: '1.15rem' }, textAlign: 'center', minWidth: 0 }}>
        {greeting}
      </Typography>
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Ornament />
      </Box>
    </Stack>
  );
}
