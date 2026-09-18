import { useId } from 'react';
import { Box, Stack } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';

import { CircleButton } from '../../../../components/CircleButton';
import { useStoreT } from '../../../../i18n';
import { STORE_TOKENS as T } from '../../../../theme/tokens';
import type { SectionProps } from '../types';
import { SlideView } from './SlideView';
import { useCarousel } from './useCarousel';

/** The accessible hero carousel: labelled slides, prev/next, dots, and a pause control. */
export function HeroSlider({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  const slides = section.items;
  const carousel = useCarousel(slides.length);
  const regionId = useId();
  if (slides.length === 0) return null;
  const total = slides.length;
  return (
    <Box
      component="section"
      aria-roledescription={t('ecommStore.hero.carousel')}
      aria-label={section.title || t('ecommStore.hero.label')}
      {...carousel.bind}
      sx={{ position: 'relative' }}
    >
      <Box id={regionId} aria-live={carousel.playing ? 'off' : 'polite'}>
        {slides.map((item, index) => (
          <Box
            key={item.id}
            role="group"
            aria-roledescription={t('ecommStore.hero.slide')}
            aria-label={t('ecommStore.hero.slideOf', { vars: { n: index + 1, total } })}
            hidden={index !== carousel.index}
          >
            <SlideView item={item} eager={index === 0} />
          </Box>
        ))}
      </Box>
      {total > 1 ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center', mt: 1.5 }}>
          <CircleButton aria-label={t('ecommStore.hero.previous')} aria-controls={regionId} onClick={carousel.prev}>
            <ChevronLeftRoundedIcon />
          </CircleButton>
          {slides.map((item, index) => (
            <Box
              key={item.id}
              component="button"
              type="button"
              aria-label={t('ecommStore.hero.goTo', { vars: { n: index + 1 } })}
              aria-current={index === carousel.index ? 'true' : undefined}
              onClick={() => carousel.goTo(index)}
              sx={{ border: 0, p: 0, bgcolor: 'transparent', cursor: 'pointer', minWidth: 24, height: 24, display: 'grid', placeItems: 'center' }}
            >
              <Box
                component="span"
                sx={{
                  display: 'block',
                  width: index === carousel.index ? 28 : 10,
                  height: 10,
                  borderRadius: T.radius.pill,
                  bgcolor: index === carousel.index ? T.navBar : T.inputBorder,
                  transition: 'width 200ms ease',
                }}
              />
            </Box>
          ))}
          <CircleButton aria-label={t('ecommStore.hero.next')} aria-controls={regionId} onClick={carousel.next}>
            <ChevronRightRoundedIcon />
          </CircleButton>
          {carousel.canAutoplay ? (
            <CircleButton
              aria-label={carousel.paused ? t('ecommStore.hero.play') : t('ecommStore.hero.pause')}
              onClick={carousel.togglePaused}
            >
              {carousel.paused ? <PlayArrowRoundedIcon /> : <PauseRoundedIcon />}
            </CircleButton>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
}
