import { Fab, Skeleton, Stack, Typography, Zoom } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

/** Bubble-shaped placeholders while the first page loads. */
export function ThreadSkeleton() {
  return (
    <Stack spacing={1} sx={{ flex: 1, p: 1.5 }}>
      {[64, 40, 88, 52].map((height, index) => (
        <Skeleton
          key={height}
          variant="rounded"
          height={height}
          sx={{ maxWidth: '75%', alignSelf: index % 2 ? 'flex-end' : 'flex-start' }}
        />
      ))}
    </Stack>
  );
}

interface JumpProps {
  show: boolean;
  /** Messages that arrived while scrolled up — 0 makes it a plain arrow. */
  unseen: number;
  onJump: () => void;
}

/**
 * Back to the bottom, carrying the count of what was missed.
 *
 * It exists because the thread does NOT follow new messages while you are
 * reading something older — so there has to be a way back that also says how
 * much you have not seen.
 */
export function JumpToLatest({ show, unseen, onJump }: Readonly<JumpProps>) {
  const label = unseen > 0 ? `${unseen} new messages — jump to latest` : 'Jump to latest';
  return (
    <Zoom in={show}>
      <Fab
        size="small"
        color={unseen > 0 ? 'primary' : 'default'}
        onClick={onJump}
        aria-label={label}
        sx={{ position: 'absolute', right: 16, bottom: 12 }}
      >
        {unseen > 0 ? (
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {unseen > 9 ? '9+' : unseen}
          </Typography>
        ) : (
          <KeyboardArrowDownIcon />
        )}
      </Fab>
    </Zoom>
  );
}
