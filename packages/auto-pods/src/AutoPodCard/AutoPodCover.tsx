import { useState } from 'react';
import Box from '@mui/material/Box';
import CardMedia from '@mui/material/CardMedia';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';

/**
 * The card's cover image. A template's URL is whatever was uploaded for it, and
 * an image that has since been deleted or moved 404s at request time rather
 * than arriving empty — so the dead URL is caught on its error event and swapped
 * for the placeholder instead of the browser's broken-image glyph.
 */
export function AutoPodCover({ url }: Readonly<{ url: string }>) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <Box
        sx={{
          height: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          color: 'text.disabled',
        }}
      >
        <ImageNotSupportedIcon fontSize="large" />
      </Box>
    );
  }
  return (
    <CardMedia
      component="img"
      height="150"
      image={url}
      alt=""
      onError={() => setBroken(true)}
      sx={{ objectFit: 'cover' }}
    />
  );
}
