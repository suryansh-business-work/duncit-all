import { Box, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

import { SmartLink } from '../../../../components/SmartLink';
import { StoreImage } from '../../../../components/StoreImage';
import { STORE_TOKENS as T, tintAt } from '../../../../theme/tokens';

/** What a "Shop by pet" tile shows, from an operator's tile or a pet type. */
export interface PetTileData {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
}

/**
 * One tinted tile, the whole card a single link: words top-left, the picture
 * on the right, and a round arrow bottom-right (decoration; the card is the
 * control).
 */
export function PetTile({ tile, position }: Readonly<{ tile: PetTileData; position: number }>) {
  return (
    <SmartLink
      to={tile.link}
      underline="none"
      color="inherit"
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
        alignItems: 'center',
        gap: 1,
        height: '100%',
        minHeight: 190,
        bgcolor: tintAt(position),
        borderRadius: `${T.radius.card}px`,
        p: 2.5,
        color: T.ink,
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        '&:hover': { boxShadow: T.shadow, transform: 'translateY(-2px)' },
      }}
    >
      <Stack spacing={0.5} sx={{ alignSelf: 'flex-start', minWidth: 0 }}>
        {tile.eyebrow ? (
          <Typography variant="overline" component="p" sx={{ color: T.ctaInk, lineHeight: 1.4 }}>
            {tile.eyebrow}
          </Typography>
        ) : null}
        <Typography variant="h3" component="h3" sx={{ fontWeight: 800 }}>
          {tile.title}
        </Typography>
        {tile.subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {tile.subtitle}
          </Typography>
        ) : null}
      </Stack>
      {/* The picture fills its half of the tile whatever its shape: a wide banner or a square cut-out. */}
      <Box sx={{ alignSelf: 'stretch', minWidth: 0, minHeight: 140, borderRadius: `${T.radius.panel}px`, overflow: 'hidden' }}>
        <StoreImage
          src={tile.image}
          alt=""
          width={320}
          height={320}
          sx={{ height: '100%', aspectRatio: 'auto', objectFit: 'cover' }}
        />
      </Box>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          boxShadow: T.shadow,
          width: 44,
          height: 44,
          borderRadius: '50%',
          bgcolor: T.navBar,
          color: T.onBrand,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <ArrowForwardRoundedIcon />
      </Box>
    </SmartLink>
  );
}
