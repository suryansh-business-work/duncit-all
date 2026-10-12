import { Box, Link, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  media: readonly { url: string; type: string }[];
}

/**
 * The pod's own photos and videos, as they rode on the request — what the
 * reviewer checks the evening against. Each opens full-size in a new tab.
 */
export default function ReleaseMediaGallery({ media }: Readonly<Props>) {
  const { t } = useTranslation();
  if (media.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('finance.paymentRelease.noMedia')}
      </Typography>
    );
  }
  return (
    <Box
      component="ul"
      data-testid="release-media-gallery"
      sx={{
        listStyle: 'none',
        p: 0,
        m: 0,
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
      }}
    >
      {media.map((item, index) => {
        const label = t('finance.paymentRelease.openMedia', { vars: { index: index + 1 } });
        const frame = { width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 2, display: 'block' };
        return (
          <Box component="li" key={item.url}>
            {item.type === 'VIDEO' ? (
              <Box component="video" src={item.url} controls preload="metadata" aria-label={label} sx={frame}>
                <track kind="captions" />
              </Box>
            ) : (
              <Link href={item.url} target="_blank" rel="noreferrer" aria-label={label}>
                <Box component="img" src={item.url} alt="" loading="lazy" sx={frame} />
              </Link>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
