import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Box, IconButton, Stack } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VideoMedia from '../../components/media/VideoMedia';

interface Props {
  media: { url: string; type: string }[];
  title: string;
  saved: boolean;
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

export default function ClubHero({
  media,
  title,
  saved,
  following,
  onBack,
  onToggleFollow,
  onToggleSave,
  onShare,
}: Props) {
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
          sx={overlayBtn}
        >
          {saved ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
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
