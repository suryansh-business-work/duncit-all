import { useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box, Stack, useMediaQuery } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { isVideoMedia } from '@duncit/utils';
import HeroOverlayActions from './HeroOverlayActions';
import { NextArrow, PrevArrow, SlideCounter } from './HeroCarouselControls';
import SlideshowToggle from './SlideshowToggle';
import VideoMedia from '../../components/media/VideoMedia';

/** One height for the photo, the video and the empty placeholder. */
const HERO_HEIGHT = { xs: 280, md: 420 };

/** The hero sits inside the page padding as a 24px-cornered block. */
const heroFrame = {
  position: 'relative' as const,
  borderRadius: '24px',
  overflow: 'hidden',
  bgcolor: 'action.hover',
};

interface Props {
  media: { url: string; type: string }[];
  title: string;
  saved: boolean;
  saveLoading?: boolean;
  onBack: () => void;
  onToggleSave: () => void;
  onShare: () => void;
}

/**
 * The top bar and the pod's cover media: a carousel of its photos and clips
 * inside the page padding, or a quiet placeholder when it has none. The title
 * is not repeated over the photo — it leads the overview right below.
 */
export default function PodHero({
  media,
  title,
  saved,
  saveLoading,
  onBack,
  onToggleSave,
  onShare,
}: Readonly<Props>) {
  const [currentSlide, setCurrentSlide] = useState(0);
  // Starts still for anyone who asked their OS for less motion; the toggle wins after that.
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [pausedByUser, setPausedByUser] = useState<boolean | null>(null);
  const playing = media.length > 1 && !(pausedByUser ?? reduceMotion);
  const topBar = (
    <HeroOverlayActions
      onBack={onBack}
      saved={saved}
      saveLoading={saveLoading}
      onToggleSave={onToggleSave}
      onShare={onShare}
    />
  );

  if (media.length === 0) {
    return (
      <Stack spacing={2} data-testid="pod-hero">
        {topBar}
        <Box
          data-testid="pod-hero-placeholder"
          sx={{ ...heroFrame, height: HERO_HEIGHT, display: 'grid', placeItems: 'center' }}
        >
          <EventIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} data-testid="pod-hero">
      {topBar}
      <Box sx={heroFrame}>
        <Slider
          dots={false}
          arrows={media.length > 1}
          prevArrow={<PrevArrow testId="pod-hero-prev" />}
          nextArrow={<NextArrow testId="pod-hero-next" />}
          infinite={media.length > 1}
          autoplay={playing}
          autoplaySpeed={4500}
          afterChange={setCurrentSlide}
          slidesToShow={1}
          slidesToScroll={1}
        >
          {media.map((m, i) =>
            isVideoMedia(m) ? (
              <VideoMedia key={m.url} src={m.url} height={HERO_HEIGHT} testId={`detail-hero-video-${i}`} />
            ) : (
              <Box
                key={m.url}
                component="img"
                src={m.url}
                alt={title}
                data-testid={`detail-hero-image-${i}`}
                sx={{ width: '100%', height: HERO_HEIGHT, objectFit: 'cover', display: 'block' }}
              />
            )
          )}
        </Slider>
        {media.length > 1 && <SlideCounter index={currentSlide} total={media.length} />}
        {media.length > 1 && <SlideshowToggle playing={playing} onToggle={() => setPausedByUser(playing)} />}
      </Box>
    </Stack>
  );
}
