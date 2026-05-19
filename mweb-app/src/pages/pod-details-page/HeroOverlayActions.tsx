import { CircularProgress, Stack, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';

interface Props {
  onBack: () => void;
  saved: boolean;
  saveLoading?: boolean;
  following: boolean;
  onToggleFollow: () => void;
  onToggleSave: () => void;
  onShare: () => void;
}

const overlayBtn = {
  bgcolor: 'rgba(255,255,255,0.92)',
  color: '#111827',
  width: 40,
  height: 40,
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
  backdropFilter: 'blur(10px)',
  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
};

export default function HeroOverlayActions({ onBack, saved, saveLoading, following, onToggleFollow, onToggleSave, onShare }: Props) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top) + 12px)',
        left: 12,
        right: 12,
        zIndex: 3,
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
          aria-label={following ? 'Following pod' : 'Follow pod'}
          onClick={onToggleFollow}
          sx={{ ...overlayBtn, color: following ? '#ed4f7a' : '#111827' }}
        >
          {following ? <NotificationsActiveIcon fontSize="small" /> : <NotificationsNoneIcon fontSize="small" />}
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
}
