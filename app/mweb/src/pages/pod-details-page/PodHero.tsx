import { useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box, IconButton, Typography } from '@mui/material';
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
  bgcolor: 'rgba(17,24,39,0.32)',
  color: '#fff',
  width: 40,
  height: 40,
  border: '1px solid rgba(255,255,255,0.32)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  '&:hover': { bgcolor: 'rgba(17,24,39,0.48)' },
};

function PrevArrow({ onClick }: Readonly<{ onClick?: () => void }>) {
  return (
    <IconButton size="small" onClick={onClick} aria-label="Previous" sx={{ ...arrowBtn, left: 10 }}>
      <ChevronLeftIcon />
    </IconButton>
  );
}

function NextArrow({ onClick }: Readonly<{ onClick?: () => void }>) {
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
  saveLoading?: boolean;
  following: boolean;
  onBack: () => void;
  onToggleFollow: () => void;
  onToggleSave: () => void;
  onShare: () => void;
}

export default function PodHero({
  media,
  title,
  saved,
  saveLoading,
  following,
  onBack,
  onToggleFollow,
  onToggleSave,
  onShare,
}: Readonly<Props>) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (media.length === 0) {
    return (
      <Box
        sx={{
          position: 'relative',
          mt: -2,
          mx: { xs: -2, sm: -3 },
          height: 240,
          borderRadius: { xs: 4, sm: 5 },
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #17111d 0%, #2c1728 56%, #111827 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EventIcon sx={{ fontSize: 80, color: 'rgba(255,255,255,0.24)' }} />
        <Typography sx={{ position: 'absolute', left: 18, bottom: 20, right: 18, color: '#fff', fontWeight: 900, lineHeight: 1.05 }} variant="h4">
          {title}
        </Typography>
        <HeroOverlayActions
          onBack={onBack}
          saved={saved}
          saveLoading={saveLoading}
          following={following}
          onToggleFollow={onToggleFollow}
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
        borderRadius: { xs: 4, sm: 5 },
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
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(5,5,8,0.22) 0%, rgba(5,5,8,0) 38%, rgba(5,5,8,0.72) 100%)' }} />
      <Box sx={{ position: 'absolute', left: 16, right: 90, bottom: 16, zIndex: 2, color: '#fff', pointerEvents: 'none' }}>
        <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
          {title}
        </Typography>
      </Box>
      <HeroOverlayActions
        onBack={onBack}
        saved={saved}
        saveLoading={saveLoading}
        following={following}
        onToggleFollow={onToggleFollow}
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
