import { useState } from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { resolveIconSource } from '@duncit/fallback-icons';
import { mergeSx } from '@duncit/ui';
import { imageSourceUrl } from '@duncit/utils';

import { STORE_FALLBACK_ICONS } from '../fallback-icons';

interface StoreImageProps {
  src: string;
  alt: string;
  /** Intrinsic size: reserves the box before the bytes arrive, so nothing shifts. */
  width: number;
  height: number;
  /** Above-the-fold images load at once; everything else waits for the viewport. */
  eager?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * A catalogue image: resized by the CDN to the width it paints at, lazy by
 * default, and swapped for the bundled placeholder when the URL is blank or
 * fails to load.
 */
export function StoreImage({ src, alt, width, height, eager = false, sx }: Readonly<StoreImageProps>) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const { source } = resolveIconSource(
    imageSourceUrl(src, width * 2),
    STORE_FALLBACK_ICONS.placeholder,
    failedSrc === src,
  );
  return (
    <Box
      component="img"
      src={source}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedSrc(src)}
      sx={mergeSx(
        { display: 'block', width: '100%', height: 'auto', aspectRatio: `${width} / ${height}`, objectFit: 'cover' },
        sx,
      )}
    />
  );
}
