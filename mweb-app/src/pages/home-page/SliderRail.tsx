import { Box } from '@mui/material';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import SliderCard from './SliderCard';

interface SliderRailProps {
  sliders: any[];
}

export default function SliderRail({ sliders }: SliderRailProps) {
  if (sliders.length === 0) return null;
  // Rendered OUTSIDE the parent Stack so MUI Stack's child-margin reset
  // cannot clobber the -50vw escape used to break out of the centred Container.
  return (
    <Box
      sx={{
        mt: -2,
        mb: 3,
        position: 'relative',
        left: '50%',
        right: '50%',
        ml: '-50vw',
        mr: '-50vw',
        width: '100vw',
        borderRadius: 0,
        lineHeight: 0,
        bgcolor: 'background.paper',
        '.slick-slider, .slick-list': { width: '100%' },
        '.slick-track': { display: 'flex' },
        '.slick-slide': { height: 'auto', lineHeight: 0 },
        '.slick-slide > div': { height: '100%' },
        '.slick-dots': { bottom: 12 },
        '.slick-dots li button:before': { color: 'common.white', opacity: 0.6 },
        '.slick-dots li.slick-active button:before': { opacity: 1 },
        '.slick-prev, .slick-next': { zIndex: 1, width: 36, height: 36 },
        '.slick-prev': { left: 12 },
        '.slick-next': { right: 12 },
      }}
    >
      <Slider
        dots
        arrows={sliders.length > 1}
        infinite={sliders.length > 1}
        autoplay={sliders.length > 1}
        autoplaySpeed={5000}
        speed={500}
        slidesToShow={1}
        slidesToScroll={1}
      >
        {sliders.map((s) => (
          <Box key={s.id} sx={{ width: '100%', height: '100%' }}>
            <SliderCard slider={s} />
          </Box>
        ))}
      </Slider>
    </Box>
  );
}
