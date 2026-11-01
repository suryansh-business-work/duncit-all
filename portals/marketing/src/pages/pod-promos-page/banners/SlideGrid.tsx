import { Grid } from '@mui/material';
import type { PodBannerSlide } from '../queries';
import SlideTile from './SlideTile';
import type { ThemeChoice } from './BannerThemeSelect';
import type { SizeChoice } from './BannerSizeSelect';

interface Props {
  slides: readonly PodBannerSlide[];
  podId: string;
  podTitle: string;
  theme: ThemeChoice;
  size: SizeChoice;
  onReplaced: (slide: PodBannerSlide) => void;
}

/** The carousel in posting order, one tile per slide. */
export default function SlideGrid({ slides, podId, podTitle, theme, size, onReplaced }: Readonly<Props>) {
  return (
    <Grid container spacing={2} data-testid="banner-slide-grid">
      {slides.map((slide) => (
        <Grid key={slide.kind} size={{ xs: 12, sm: 6, md: 4 }}>
          <SlideTile slide={slide} podId={podId} podTitle={podTitle} theme={theme} size={size} onReplaced={onReplaced} />
        </Grid>
      ))}
    </Grid>
  );
}

/** The set with one slide swapped for its new render; every other slide keeps its place. */
export const replaceSlide = (slides: readonly PodBannerSlide[], next: PodBannerSlide): PodBannerSlide[] =>
  slides.map((slide) => (slide.kind === next.kind ? next : slide));
