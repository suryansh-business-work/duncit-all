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
import { CarouselDots } from './CarouselDots';
import { SlideView } from './SlideView';
import { useCarousel } from './useCarousel';

const NO_TRUST: NonNullable<SectionProps['trust']> = [];

/** The round arrows over the card's left and right edges, desktop only. */
const edgeArrow = (side: 'left' | 'right') =>
  ({ position: 'absolute', top: '50%', [side]: 12, transform: 'translateY(-50%)', display: { xs: 'none', md: 'inline-flex' }, boxShadow: T.shadow }) as const;

/** The accessible hero carousel: labelled slides, prev/next, dots, and a pause control. */
export function HeroSlider({ section, trust = NO_TRUST }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  const slides = section.items;
  const carousel = useCarousel(slides.length);
  const regionId = useId();
  if (slides.length === 0) return null;
  const total = slides.length;
  const prevLabel = t('ecommStore.hero.previous');
  const nextLabel = t('ecommStore.hero.next');
  return (
    <Box
      component="section"
      aria-roledescription={t('ecommStore.hero.carousel')}
      aria-label={section.title || t('ecommStore.hero.label')}
      {...carousel.bind}
    >
      <Box sx={{ position: 'relative' }}>
        <Box id={regionId} aria-live={carousel.playing ? 'off' : 'polite'}>
          {slides.map((item, index) => (
            <Box
              key={item.id}
              role="group"
              aria-roledescription={t('ecommStore.hero.slide')}
              aria-label={t('ecommStore.hero.slideOf', { vars: { n: index + 1, total } })}
              hidden={index !== carousel.index}
            >
              <SlideView item={item} eager={index === 0} trust={trust} />
            </Box>
          ))}
        </Box>
        {total > 1 ? (
          <>
            <CircleButton aria-label={prevLabel} aria-controls={regionId} onClick={carousel.prev} sx={edgeArrow('left')}>
              <ChevronLeftRoundedIcon />
            </CircleButton>
            <CircleButton aria-label={nextLabel} aria-controls={regionId} onClick={carousel.next} sx={edgeArrow('right')}>
              <ChevronRightRoundedIcon />
            </CircleButton>
          </>
        ) : null}
      </Box>
      {total > 1 ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center', mt: 2 }}>
          <CircleButton aria-label={prevLabel} aria-controls={regionId} onClick={carousel.prev} sx={{ display: { md: 'none' } }}>
            <ChevronLeftRoundedIcon />
          </CircleButton>
          <CarouselDots slides={slides} index={carousel.index} goTo={carousel.goTo} />
          <CircleButton aria-label={nextLabel} aria-controls={regionId} onClick={carousel.next} sx={{ display: { md: 'none' } }}>
            <ChevronRightRoundedIcon />
          </CircleButton>
          {carousel.canAutoplay ? (
            <CircleButton aria-label={carousel.paused ? t('ecommStore.hero.play') : t('ecommStore.hero.pause')} onClick={carousel.togglePaused}>
              {carousel.paused ? <PlayArrowRoundedIcon /> : <PauseRoundedIcon />}
            </CircleButton>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
}
