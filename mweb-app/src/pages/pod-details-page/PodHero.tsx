import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import HeroOverlayActions from './HeroOverlayActions';
import VideoMedia from '../../components/media/VideoMedia';

interface Props {
  media: { url: string; type: string }[];
  title: string;
  saved: boolean;
  onBack: () => void;
  onToggleSave: () => void;
  onShare: () => void;
}

export default function PodHero({
  media,
  title,
  saved,
  onBack,
  onToggleSave,
  onShare,
}: Props) {
  if (media.length === 0) {
    return (
      <Box
        sx={{
          position: 'relative',
          mt: -2,
          mx: { xs: -2, sm: -3 },
          height: 240,
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EventIcon sx={{ fontSize: 80, color: 'action.disabled' }} />
        <HeroOverlayActions
          onBack={onBack}
          saved={saved}
          onToggleSave={onToggleSave}
          onShare={onShare}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        mt: -2,
        mx: { xs: -2, sm: -3 },
        overflow: 'hidden',
        '.slick-dots': { bottom: 12 },
        '.slick-dots li button:before': { color: 'common.white', opacity: 0.6 },
        '.slick-dots li.slick-active button:before': { opacity: 1 },
      }}
    >
      <Slider
        dots
        arrows={media.length > 1}
        infinite={media.length > 1}
        autoplay={media.length > 1}
        autoplaySpeed={4500}
        slidesToShow={1}
        slidesToScroll={1}
      >
        {media.map((m, i) =>
          m.type === 'VIDEO' ? (
            <VideoMedia key={i} src={m.url} height={{ xs: 280, md: 460 }} />
          ) : (
            <Box
              key={i}
              component="img"
              src={m.url}
              alt={title}
              sx={{
                width: '100%',
                height: { xs: 280, md: 460 },
                objectFit: 'cover',
              }}
            />
          )
        )}
      </Slider>
      <HeroOverlayActions
        onBack={onBack}
        saved={saved}
        onToggleSave={onToggleSave}
        onShare={onShare}
      />
    </Box>
  );
}
