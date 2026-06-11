import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box, CircularProgress, IconButton, Stack } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import VideoMedia from '../../components/media/VideoMedia';

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

const overlayBtn = {
  bgcolor: 'rgba(0,0,0,0.45)',
  color: 'common.white',
  backdropFilter: 'blur(6px)',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
};

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

export default function ClubHero({
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
  const overlay = (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top) + 8px)',
        left: 8,
        right: 8,
        zIndex: 2,
        pointerEvents: 'none',
        '& > *': { pointerEvents: 'auto' },
      }}
    >
      <IconButton size="small" onClick={onBack} aria-label="Back" sx={overlayBtn}>
        <ArrowBackIcon fontSize="small" />
      </IconButton>
      <Stack direction="row" spacing={0.75}>
        <IconButton
          size="small"
          aria-label={following ? 'Following' : 'Follow'}
          onClick={onToggleFollow}
          sx={{ ...overlayBtn, color: following ? 'error.light' : 'common.white' }}
        >
          {following ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
        </IconButton>
        <IconButton
          size="small"
          aria-label={saved ? 'Saved' : 'Save'}
          onClick={onToggleSave}
          disabled={saveLoading}
          sx={overlayBtn}
        >
          {saveLoading ? <CircularProgress size={18} color="inherit" /> : saved ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
        </IconButton>
        <IconButton size="small" aria-label="Share" onClick={onShare} sx={overlayBtn}>
          <ShareIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );

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
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <GroupsIcon sx={{ fontSize: 80, color: 'action.disabled' }} />
        {overlay}
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
        dots
        arrows={media.length > 1}
        prevArrow={<PrevArrow />}
        nextArrow={<NextArrow />}
        infinite={media.length > 1}
        autoplay={media.length > 1}
        autoplaySpeed={5000}
        slidesToShow={1}
        slidesToScroll={1}
      >
        {media.map((m, i) =>
          m.type === 'VIDEO' ? (
            <VideoMedia
              key={i}
              src={m.url}
              height={{ xs: 280, md: 460 }}
            />
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
      {overlay}
    </Box>
  );
}
