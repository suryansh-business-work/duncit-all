import Slider from 'react-slick';
import { Box } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';

interface Media {
  url: string;
  type: 'IMAGE' | 'VIDEO';
}

interface Props {
  media: Media[];
  fallbackUrl?: string | null;
  alt?: string;
}

export default function ExploreMediaCarousel({ media, fallbackUrl, alt }: Props) {
  const items = media && media.length > 0
    ? media
    : fallbackUrl
      ? [{ url: fallbackUrl, type: 'IMAGE' as const }]
      : [];

  if (items.length === 0) {
    return (
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.900',
        }}
      >
        <EventIcon sx={{ fontSize: 80, color: 'grey.700' }} />
      </Box>
    );
  }

  if (items.length === 1) {
    const m = items[0];
    return m.type === 'VIDEO' ? (
      <Box
        component="video"
        src={m.url}
        autoPlay
        muted
        loop
        playsInline
        sx={mediaSx}
      />
    ) : (
      <Box component="img" src={m.url} alt={alt} sx={mediaSx} />
    );
  }

  return (
    <Box sx={{ position: 'absolute', inset: 0, '& .slick-slider, & .slick-list, & .slick-track, & .slick-slide > div': { height: '100%' }, '& .slick-dots': { bottom: 90 }, '& .slick-dots li button:before': { color: 'common.white' } }}>
      <Slider
        dots
        arrows={false}
        infinite={false}
        slidesToShow={1}
        slidesToScroll={1}
        adaptiveHeight={false}
        swipeToSlide
      >
        {items.map((m, i) => (
          <Box key={i} sx={{ position: 'relative', height: '100%' }}>
            {m.type === 'VIDEO' ? (
              <Box
                component="video"
                src={m.url}
                autoPlay
                muted
                loop
                playsInline
                sx={mediaSx}
              />
            ) : (
              <Box component="img" src={m.url} alt={alt} sx={mediaSx} />
            )}
          </Box>
        ))}
      </Slider>
    </Box>
  );
}

const mediaSx = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
};
