import { Chip, Divider, Fab, Skeleton, Stack, Typography, Zoom } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Skip the work of laying out what is off screen.
 *
 * This is the virtualisation, and it is deliberately the browser's rather than a
 * windowing library's. A chat has variable-height rows — a one-word reply and a
 * fenced code block with an image under it — so react-window would need every
 * height measured or guessed, and windowing also breaks the three things people
 * actually do in a thread: select text across several messages, use the
 * browser's own find, and jump to a search hit that is not currently rendered.
 *
 * `content-visibility: auto` skips rendering and painting for off-screen rows
 * while leaving them in the DOM, so all three keep working. The intrinsic size
 * is `auto`, which means the browser remembers each row's last real height
 * instead of guessing one — that is what stops the scrollbar jumping when you
 * scroll back up through a long conversation.
 */
export const OFFSCREEN_SKIP = {
  contentVisibility: 'auto',
  containIntrinsicSize: 'auto 72px',
} as const;

/** Today, Yesterday, or the date — above the first entry of each day. */
export function DaySeparator({ label }: Readonly<{ label: string }>) {
  return (
    <Divider sx={{ my: 1 }}>
      <Chip size="small" label={label} sx={{ height: 22, fontSize: 11 }} />
    </Divider>
  );
}

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
  const { t } = useTranslation();
  const label =
    unseen > 0
      ? t('shell.chat.thread.newMessages', { vars: { count: String(unseen) } })
      : t('shell.chat.thread.jumpToLatest');
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
