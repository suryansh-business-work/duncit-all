import { Stack, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';

interface Props {
  onBack: () => void;
  saved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
}

const overlayBtn = {
  bgcolor: 'rgba(0,0,0,0.45)',
  color: 'common.white',
  backdropFilter: 'blur(6px)',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
};

export default function HeroOverlayActions({ onBack, saved, onToggleSave, onShare }: Props) {
  return (
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
}
