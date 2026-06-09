import { useState, type ReactNode } from 'react';
import { Box, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import { useDraggable } from './useDraggable';

interface Props {
  open: boolean;
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  /** Footer actions (e.g. Send button). */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Gmail-style compose window: anchored bottom-right, draggable by its header,
 * with minimize (collapse to the title bar) and maximize (large centered)
 * controls. It is non-blocking — no backdrop — so the rest of the page stays
 * usable while composing, exactly like Gmail's compose panel.
 */
export default function ComposeWindow({ open, title, icon, onClose, actions, children }: Readonly<Props>) {
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const { offset, onPointerDown, reset } = useDraggable(!maximized);

  if (!open) return null;

  const toggleMax = () => {
    setMaximized((m) => !m);
    setMinimized(false);
    reset();
  };

  const width = maximized ? 'min(900px, 96vw)' : 'min(460px, 96vw)';
  const transform = maximized ? 'translateX(-50%)' : `translate(${offset.x}px, ${offset.y}px)`;

  return (
    <Paper
      elevation={12}
      role="dialog"
      aria-label={title}
      sx={{
        position: 'fixed',
        zIndex: (t) => t.zIndex.modal,
        bottom: maximized ? 'auto' : 16,
        top: maximized ? 24 : 'auto',
        right: maximized ? 'auto' : 16,
        left: maximized ? '50%' : 'auto',
        transform,
        width,
        maxHeight: maximized ? '92vh' : '70vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 1.5,
      }}
      data-testid="compose-window"
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        onPointerDown={onPointerDown}
        onDoubleClick={() => setMinimized((m) => !m)}
        sx={{
          px: 1.5,
          py: 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          cursor: maximized ? 'default' : 'move',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        {icon}
        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1 }}>
          {title}
        </Typography>
        <Tooltip title={minimized ? 'Expand' : 'Minimize'}>
          <IconButton size="small" sx={{ color: 'inherit' }} onClick={() => setMinimized((m) => !m)} aria-label="minimize">
            <MinimizeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={maximized ? 'Restore' : 'Maximize'}>
          <IconButton size="small" sx={{ color: 'inherit' }} onClick={toggleMax} aria-label="maximize">
            {maximized ? <FilterNoneIcon fontSize="small" /> : <CropSquareIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Close">
          <IconButton size="small" sx={{ color: 'inherit' }} onClick={onClose} aria-label="close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {!minimized && (
        <>
          <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>{children}</Box>
          {actions && (
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
              {actions}
            </Stack>
          )}
        </>
      )}
    </Paper>
  );
}
