import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import MinimizeIcon from '@mui/icons-material/Minimize';

interface TitleBarProps {
  title: string;
  subtitle?: string;
  maximised: boolean;
  onMinimise: () => void;
  onToggleMaximise: () => void;
  onClose: () => void;
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
}

/** The bar you drag, and the three buttons everyone already knows. */
export function TitleBar({
  title,
  subtitle,
  maximised,
  onMinimise,
  onToggleMaximise,
  onClose,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: Readonly<TitleBarProps>) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      sx={{
        px: 1,
        py: 0.5,
        borderBottom: 1,
        borderColor: 'divider',
        cursor: maximised ? 'default' : 'move',
        // Or dragging selects the title text instead of moving the window.
        userSelect: 'none',
        touchAction: 'none',
        bgcolor: 'action.hover',
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle2" noWrap>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Tooltip title="Minimise">
        <IconButton size="small" onClick={onMinimise} aria-label="Minimise this window">
          <MinimizeIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={maximised ? 'Restore' : 'Maximise'}>
        <IconButton
          size="small"
          onClick={onToggleMaximise}
          aria-label={maximised ? 'Restore this window' : 'Maximise this window'}
        >
          {maximised ? <FilterNoneIcon fontSize="small" /> : <CropSquareIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Tooltip title="Close">
        <IconButton size="small" color="error" onClick={onClose} aria-label="Close this window">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

interface GripProps {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
}

/** The corner you pull to resize. */
export function ResizeGrip({ onPointerDown, onPointerMove, onPointerUp }: Readonly<GripProps>) {
  return (
    <Box
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-hidden
      sx={{
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 16,
        height: 16,
        cursor: 'nwse-resize',
        touchAction: 'none',
        // Two lines, the way every OS draws a grip.
        background:
          'repeating-linear-gradient(135deg, transparent 0 3px, currentColor 3px 4px)',
        opacity: 0.4,
      }}
    />
  );
}
