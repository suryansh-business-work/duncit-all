import { Box, CircularProgress, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/EventOutlined';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { DuncitRoundButton } from '@duncit/buttons';

/** A small surface pill over the card's image — the date and the category. */
const PILL_SX = {
  position: 'absolute',
  left: 8,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  px: 1.25,
  borderRadius: 999,
  bgcolor: 'background.paper',
  color: 'text.primary',
} as const;

/** The date/time pill at the image's top-left (clear of the save button). */
export function PodDatePill({ text }: Readonly<{ text: string }>) {
  return (
    <Box sx={{ ...PILL_SX, top: 8, height: 26, maxWidth: 'calc(100% - 60px)' }}>
      <EventIcon sx={{ fontSize: 14, color: 'text.secondary', flex: '0 0 auto' }} />
      <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1 }}>
        {text}
      </Typography>
    </Box>
  );
}

/** The pod's category at the image's bottom-left. */
export function PodCategoryPill({ label }: Readonly<{ label: string }>) {
  return (
    <Box sx={{ ...PILL_SX, bottom: 8, height: 24, maxWidth: 'calc(100% - 16px)' }}>
      <Typography noWrap sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1 }}>
        {label}
      </Typography>
    </Box>
  );
}

interface PodSaveButtonProps {
  saved?: boolean;
  /** The toggle is in flight — the icon becomes a spinner. */
  saving?: boolean;
  label: string;
  onToggle: () => void;
}

/** The 36px round save button at the image's top-right. Its click never
 * reaches the card, which would open the pod. */
export function PodSaveButton({ saved, saving, label, onToggle }: Readonly<PodSaveButtonProps>) {
  // Hoisted out of the JSX: a spinner-or-icon choice inline would nest ternaries (S3358).
  const savedIcon = saved ? <BookmarkIcon /> : <BookmarkBorderIcon />;
  const content = saving ? <CircularProgress size={18} color="inherit" /> : savedIcon;
  return (
    <DuncitRoundButton
      aria-label={label}
      aria-pressed={saved}
      disabled={saving}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      sx={{
        position: 'absolute',
        top: 6,
        right: 6,
        bgcolor: 'background.paper',
        color: 'secondary.main',
        '&:hover': { bgcolor: 'background.paper' },
        // Disabled only while the toggle is in flight — keep it legible.
        '&.Mui-disabled': { bgcolor: 'background.paper', color: 'secondary.main' },
      }}
    >
      {content}
    </DuncitRoundButton>
  );
}
