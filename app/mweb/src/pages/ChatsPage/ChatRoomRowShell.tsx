import type { ReactNode } from 'react';
import { Avatar, Box, ButtonBase, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { SURFACE_SX } from '../../theme';

interface Props {
  testId: string;
  coverUrl?: string | null;
  /** Shown on the brand fill when the room has no cover photo. */
  fallbackIcon: ReactNode;
  title: string;
  /** The lines under the title — when, who, the last message. */
  children: ReactNode;
  onOpen: () => void;
}

/** One chat room card: cover, title, its lines and a chevron — the same calm
 * card for a pod room and a club room (native twin: ChatRoomAvatar + cards). */
export default function ChatRoomRowShell({ testId, coverUrl, fallbackIcon, title, children, onOpen }: Readonly<Props>) {
  return (
    <ButtonBase
      data-testid={testId}
      onClick={onOpen}
      sx={{ ...SURFACE_SX, width: '100%', justifyContent: 'flex-start', textAlign: 'left', gap: 1.5, p: 1.5 }}
    >
      <Avatar
        alt=""
        src={coverUrl || undefined}
        variant="rounded"
        sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'primary.main', color: 'primary.contrastText', flexShrink: 0 }}
      >
        {fallbackIcon}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.25 }} noWrap>
          {title}
        </Typography>
        {children}
      </Box>
      <ChevronRightRoundedIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
    </ButtonBase>
  );
}
