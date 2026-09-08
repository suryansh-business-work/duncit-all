import { useRef } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box, ButtonBase } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

/** A 3:2 frame, capped so a wide desktop card does not turn the photo back
 * into a banner. The card used to give the cover a flat 120px band, which
 * sliced a venue photo down to a strip — this keeps the subject in view and
 * leaves the name block below it. Native twin uses the same ratio. */
const FRAME = { width: '100%', aspectRatio: '3 / 2', maxHeight: 300 } as const;

const arrowSx = {
  position: 'absolute' as const,
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 2,
  width: 30,
  height: 30,
  bgcolor: 'rgba(17,24,39,0.42)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.3)',
  '&:hover': { bgcolor: 'rgba(17,24,39,0.6)' },
};

function PrevArrow({ onClick }: Readonly<{ onClick?: () => void }>) {
  const { t } = useTranslation();
  return (
    <DuncitIconButton
      size="small"
      onClick={onClick}
      aria-label={t('mweb.details.previousImage')}
      sx={{ ...arrowSx, left: 8 }}
    >
      <ChevronLeftIcon fontSize="small" />
    </DuncitIconButton>
  );
}

function NextArrow({ onClick }: Readonly<{ onClick?: () => void }>) {
  const { t } = useTranslation();
  return (
    <DuncitIconButton
      size="small"
      onClick={onClick}
      aria-label={t('mweb.details.nextImage')}
      sx={{ ...arrowSx, right: 8 }}
    >
      <ChevronRightIcon fontSize="small" />
    </DuncitIconButton>
  );
}

interface Props {
  /** Cover first, then the gallery — venueImages() from @duncit/utils. */
  images: string[];
  venueName: string;
  onOpen: () => void;
}

/** The photo half of a venue card: every venue image as a swipeable slider
 * with arrows and dots, opening the venue on tap. Native twin:
 * hosts-venues/VenueCardMedia. */
export default function VenueCardMedia({ images, venueName, onOpen }: Readonly<Props>) {
  // react-slick fires a click on the slide that ended a swipe, which would
  // navigate away mid-drag. The flag is set the moment a slide starts moving.
  const dragging = useRef(false);

  if (images.length === 0) {
    return (
      <Box
        sx={{
          ...FRAME,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <StorefrontIcon sx={{ fontSize: 40 }} />
      </Box>
    );
  }

  const multiple = images.length > 1;
  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: 'common.black',
        '.slick-dots': { bottom: 8 },
        '.slick-dots li': { width: 14, height: 14, mx: 0 },
        '.slick-dots li button:before': { color: 'common.white', opacity: 0.55, fontSize: 8 },
        '.slick-dots li.slick-active button:before': { opacity: 1 },
      }}
    >
      <Slider
        dots={multiple}
        arrows={multiple}
        prevArrow={<PrevArrow />}
        nextArrow={<NextArrow />}
        infinite={multiple}
        slidesToShow={1}
        slidesToScroll={1}
        beforeChange={() => {
          dragging.current = true;
        }}
        afterChange={() => {
          dragging.current = false;
        }}
      >
        {images.map((url) => (
          <ButtonBase
            key={url}
            onClick={() => {
              if (!dragging.current) onOpen();
            }}
            aria-label={venueName}
            sx={{ display: 'block', width: '100%' }}
          >
            <Box
              component="img"
              src={url}
              alt={venueName}
              loading="lazy"
              sx={{ ...FRAME, objectFit: 'cover', display: 'block' }}
            />
          </ButtonBase>
        ))}
      </Slider>
    </Box>
  );
}
