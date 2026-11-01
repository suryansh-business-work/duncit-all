import { Box, Link, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { SLIDE_KIND_LABEL } from '../copy';
import type { PodBannerSlide } from '../queries';

const THUMB = 120;

interface Props {
  slides: readonly PodBannerSlide[];
  podTitle: string;
}

/** Every slide as a thumbnail that opens the full picture, in posting order. */
export default function SlideStrip({ slides, podTitle }: Readonly<Props>) {
  const { t } = useTranslation();
  if (slides.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('marketing.podPromo.noBanner')}
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }} component="ul" aria-label={t('marketing.podPromo.slidesLabel')} data-testid="banner-slide-strip">
      {slides.map((slide) => {
        const kind = t(SLIDE_KIND_LABEL[slide.kind]);
        return (
          <Box component="li" key={slide.kind} sx={{ listStyle: 'none', flex: '0 0 auto', width: THUMB }}>
            <Link href={slide.url} target="_blank" rel="noopener noreferrer">
              <Box
                component="img"
                src={slide.url}
                alt={t('marketing.podPromo.slideAlt', { vars: { kind, title: podTitle } })}
                sx={{ display: 'block', width: '100%', borderRadius: 1, border: 1, borderColor: 'divider' }}
              />
            </Link>
            <Typography variant="caption" color="text.secondary">
              {kind}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}
