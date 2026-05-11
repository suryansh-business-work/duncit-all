import { useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box, IconButton } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HeroOverlayActions from './HeroOverlayActions';
import VideoMedia from '../../components/media/VideoMedia';

const arrowBtn = {
  position: 'absolute' as const,
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 2,
  bgcolor: 'rgba(255,255,255,0.88)',
  color: '#111827',
  width: 36,
  height: 36,
  boxShadow: '0 2px 12px rgba(0,0,0,0.28)',
  backdropFilter: 'blur(8px)',
  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
};

function PrevArrow({ onClick }: { onClick?: () => void }) {
  return (
    <IconButton size="small" onClick={onClick} aria-label="Previous" sx={{ ...arrowBtn, left: 10 }}>
      <ChevronLeftIcon />
    </IconButton>
  );
}

function NextArrow({ onClick }: { onClick?: () => void }) {
  return (
    <IconButton size="small" onClick={onClick} aria-label="Next" sx={{ ...arrowBtn, right: 10 }}>
      <ChevronRightIcon />
    </IconButton>
  );
}

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
  const [currentSlide, setCurrentSlide] = useState(0);

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
        dots={false}
        arrows={media.length > 1}
        prevArrow={<PrevArrow />}
        nextArrow={<NextArrow />}
        infinite={media.length > 1}
        autoplay={media.length > 1}
        autoplaySpeed={4500}
        afterChange={setCurrentSlide}
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
      {media.length > 1 && (
        <Box
          sx={{
            position: 'absolute',
            right: 14,
            bottom: 14,
            zIndex: 2,
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            bgcolor: 'rgba(0,0,0,0.62)',
            color: 'common.white',
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: 0,
          }}
        >
          {currentSlide + 1}/{media.length}
        </Box>
      )}
    </Box>
  );
}
