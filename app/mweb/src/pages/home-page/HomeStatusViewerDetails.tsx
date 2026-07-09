import { Box, Stack, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import type { HomeStatusViewerSlide } from './HomeStatusViewer';

interface Props {
  current?: HomeStatusViewerSlide;
  timeLabel: string | null;
  nextPeek: HomeStatusViewerSlide[];
  index: number;
  onJumpTo: (idx: number) => void;
  hasOpenButton: boolean;
}

export default function HomeStatusViewerDetails({
  current,
  timeLabel,
  nextPeek,
  index,
  onJumpTo,
  hasOpenButton,
}: Readonly<Props>) {
  return (
    <Stack
      spacing={1}
      sx={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: hasOpenButton
          ? 'calc(72px + env(safe-area-inset-bottom))'
          : 'calc(18px + env(safe-area-inset-bottom))',
        zIndex: 3,
      }}
    >
      {current?.caption && (
        <Typography variant="body2" sx={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          {current.caption}
        </Typography>
      )}
      {timeLabel && !current?.caption && (
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          {timeLabel}
        </Typography>
      )}
      {current?.commentCount != null && (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'rgba(255,255,255,0.92)' }}>
          <ChatBubbleOutlineIcon fontSize="small" />
          <Typography variant="caption">{current.commentCount}</Typography>
        </Stack>
      )}
      {nextPeek.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ overflow: 'hidden' }}>
          {nextPeek.map((s, i) => (
            <Box
              key={i}
              onClick={() => onJumpTo(index + 1 + i)}
              sx={{
                width: 56,
                height: 56,
                borderRadius: 1.5,
                bgcolor: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.32)',
                backgroundImage:
                  s.thumbnailUrl || s.mediaUrl ? `url(${s.thumbnailUrl || s.mediaUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
