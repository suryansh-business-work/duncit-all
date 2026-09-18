import { useEffect, useState } from 'react';
import { Box, ButtonBase, Stack } from '@mui/material';

import { StoreImage } from '../../components/StoreImage';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

interface ProductGalleryProps {
  images: string[];
  title: string;
}

/**
 * The hero photo on a soft circular halo, with the other photos as small round
 * thumbnails beneath it. Each thumbnail is a toggle button naming its photo.
 */
export function ProductGallery({ images, title }: Readonly<ProductGalleryProps>) {
  const { t } = useStoreT();
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [images]);
  const current = images[active] ?? images[0] ?? '';
  return (
    <Stack spacing={2} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          aspectRatio: '1 / 1',
          display: 'grid',
          placeItems: 'center',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '6%',
            borderRadius: '50%',
            bgcolor: T.brandTint,
            boxShadow: `0 0 0 18px ${T.surface}, 0 0 0 36px ${T.brandTint}`,
          },
        }}
      >
        <Box sx={{ position: 'relative', width: '78%' }}>
          <StoreImage src={current} alt={title} width={480} height={480} eager sx={{ objectFit: 'contain', background: 'transparent' }} />
        </Box>
      </Box>
      {images.length > 1 ? (
        <Stack direction="row" spacing={1.5} component="ul" aria-label={t('ecommStore.product.gallery')} sx={{ listStyle: 'none', p: 0, m: 0, overflowX: 'auto', maxWidth: '100%', pb: 1 }}>
          {images.map((src, index) => (
            <Box component="li" key={src}>
              <ButtonBase
                aria-label={t('ecommStore.product.showImage', { vars: { n: index + 1, total: images.length } })}
                aria-pressed={index === active}
                onClick={() => setActive(index)}
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  bgcolor: T.surface,
                  border: 2,
                  borderColor: index === active ? T.brand : T.border,
                  boxShadow: T.shadow,
                }}
              >
                <StoreImage src={src} alt="" width={64} height={64} sx={{ objectFit: 'contain' }} />
              </ButtonBase>
            </Box>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
