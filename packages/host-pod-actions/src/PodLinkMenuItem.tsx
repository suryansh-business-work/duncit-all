import type { MouseEvent, ReactNode } from 'react';
import { IconButton, ListItemIcon, ListItemText, MenuItem, Stack, Tooltip } from '@mui/material';
import IosShareIcon from '@mui/icons-material/IosShare';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface Props {
  /** The line's own icon — a star for the rating link, a camera for the media one. */
  icon: ReactNode;
  label: string;
  /** Each link words its own buttons — "Share feedback link" is not "Share upload link". */
  shareLabel: string;
  copyLabel: string;
  onOpen: () => void;
  onShare: () => void;
  onCopy: () => void;
}

/**
 * One of the host's per-pod links, as a menu line with three ways to use it:
 * click the row to open the page yourself, or take the link with the two
 * buttons beside it — most hosts want to send it, not fill it in.
 *
 * Both links render through this one row (rule 40), so Share and Copy behave
 * identically wherever they appear. The buttons stop the click reaching the
 * row, or copying the link would also navigate away from the list the host is
 * working in.
 */
export default function PodLinkMenuItem({
  icon,
  label,
  shareLabel,
  copyLabel,
  onOpen,
  onShare,
  onCopy,
}: Readonly<Props>) {
  const act = (action: () => void) => (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    action();
  };

  return (
    <MenuItem onClick={onOpen}>
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={label} />
      <Stack direction="row" spacing={0.5} sx={{ pl: 1 }}>
        <Tooltip title={shareLabel}>
          <IconButton size="small" edge="end" aria-label={shareLabel} onClick={act(onShare)}>
            <IosShareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={copyLabel}>
          <IconButton size="small" edge="end" aria-label={copyLabel} onClick={act(onCopy)}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </MenuItem>
  );
}
