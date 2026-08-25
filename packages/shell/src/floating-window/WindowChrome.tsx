import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import MinimizeIcon from '@mui/icons-material/Minimize';
import { useTranslation } from '../i18n/useTranslation';

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
  const { t } = useTranslation();

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        px: 1,
        py: 0.5,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover'
      }}>
      {/*
        The drag handle is the TITLE, not the whole bar.

        It used to be the bar, which meant a pointerdown on minimise or close
        also began a drag — and a drag calls preventDefault and takes pointer
        capture, so the button never saw the pointerup that would have become
        its click. The three buttons did nothing at all. Flex-1 keeps every
        pixel left of them draggable, which is what a title bar is anyway.
      */}
      <Box
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        sx={{
          minWidth: 0,
          flex: 1,
          alignSelf: 'stretch',
          cursor: maximised ? 'default' : 'move',
          // Or dragging selects the title text instead of moving the window.
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <Typography variant="subtitle2" noWrap>
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            noWrap
            sx={{
              color: "text.secondary",
              display: 'block'
            }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Tooltip title={t('shell.chat.window.minimise')}>
        <IconButton size="small" onClick={onMinimise} aria-label={t('shell.chat.window.minimiseLabel')}>
          <MinimizeIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={t(maximised ? 'shell.chat.window.restore' : 'shell.chat.window.maximise')}>
        <IconButton
          size="small"
          onClick={onToggleMaximise}
          aria-label={t(maximised ? 'shell.chat.window.restoreLabel' : 'shell.chat.window.maximiseLabel')}
        >
          {maximised ? <FilterNoneIcon fontSize="small" /> : <CropSquareIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Tooltip title={t('shell.chat.window.close')}>
        <IconButton size="small" color="error" onClick={onClose} aria-label={t('shell.chat.window.closeLabel')}>
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
