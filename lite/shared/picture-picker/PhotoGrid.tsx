import { Box, ButtonBase, CircularProgress, Typography } from '@mui/material';
import type { PictureTile } from './picture.types';

interface PhotoGridProps {
  tiles: readonly PictureTile[];
  onPick: (tile: PictureTile) => void;
  /** The tile being added right now; every tile waits while one is. */
  busyId: string | null;
  testId: string;
}

/** Square tiles that each pick their picture on click, Enter or Space, with an optional credit underneath. */
export function PhotoGrid({ tiles, onPick, busyId, testId }: Readonly<PhotoGridProps>) {
  return (
    <Box component="ul" data-testid={testId} sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' } }}>
      {tiles.map((tile) => (
        <Box component="li" key={tile.id} sx={{ minWidth: 0 }}>
          <ButtonBase
            onClick={() => onPick(tile)}
            disabled={busyId !== null}
            aria-label={tile.alt}
            aria-busy={busyId === tile.id}
            data-testid={`${testId}-tile`}
            focusRipple
            sx={{
              position: 'relative',
              display: 'block',
              width: '100%',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: tile.color ?? 'action.hover',
              opacity: busyId !== null && busyId !== tile.id ? 0.5 : 1,
              '&:hover img': { transform: 'scale(1.03)' },
              '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
            }}
          >
            <Box component="img" src={tile.src} alt="" loading="lazy" decoding="async" sx={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', transition: 'transform .2s ease' }} />
            {busyId === tile.id ? (
              <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'action.disabledBackground' }}>
                <CircularProgress size={28} />
              </Box>
            ) : null}
          </ButtonBase>
          {tile.caption ? (
            <Typography variant="caption" color="text.secondary" noWrap component="p" sx={{ mt: 0.5 }}>
              {tile.caption}
            </Typography>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}
