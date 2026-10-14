import { useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box, ButtonBase } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import { useTranslation } from '../../i18n/useTranslation';
import { NextArrow, PrevArrow, SlideCounter } from '../pod-details-page/HeroCarouselControls';
import { HERO_SX } from './venueDetailsHelpers';

interface Props {
  /** Every venue image, cover first. */
  images: string[];
  venueName: string;
  /** Index into `images`, so the caller opens the lightbox on the same list. */
  onOpen: (index: number) => void;
}

/**
 * Every venue photo, cover first, as a swipeable hero with a "2/5" counter.
 * The hero used to show the cover alone, so the rest of the gallery — down
 * under the menu, map and amenities — read as "this venue has one photo".
 * Native twin: VenueDetailsContent's HeroCarousel.
 */
export default function VenueHero({ images, venueName, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);

  if (images.length === 0) {
    return (
      <Box sx={{ ...HERO_SX, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'brand.main' }}>
        <StorefrontIcon sx={{ fontSize: 44 }} />
      </Box>
    );
  }

  const many = images.length > 1;
  return (
    <Box data-testid="venue-hero" sx={{ ...HERO_SX, position: 'relative', bgcolor: 'action.hover' }}>
      <Slider
        dots={false}
        arrows={many}
        prevArrow={<PrevArrow testId="venue-hero-prev" />}
        nextArrow={<NextArrow testId="venue-hero-next" />}
        infinite={false}
        afterChange={setCurrent}
        slidesToShow={1}
        slidesToScroll={1}
      >
        {images.map((url, i) => (
          <ButtonBase
            key={url}
            onClick={() => onOpen(i)}
            focusRipple
            aria-label={t('mweb.podDetails.viewImage')}
            sx={{ display: 'block', width: '100%', height: HERO_SX.height }}
          >
            <Box
              component="img"
              src={url}
              alt={venueName}
              loading={i === 0 ? 'eager' : 'lazy'}
              data-testid={i === 0 ? 'venue-cover-image' : `venue-hero-image-${i}`}
              sx={{ width: '100%', height: HERO_SX.height, objectFit: 'cover', display: 'block' }}
            />
          </ButtonBase>
        ))}
      </Slider>
      {many && <SlideCounter index={current} total={images.length} />}
    </Box>
  );
}
