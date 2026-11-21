import { useId, type ReactNode } from 'react';
import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { FRAME, useFloatingFrame, type FrameMode, type FrameRect } from './useFloatingFrame';

interface Props {
  title: string;
  icon?: ReactNode;
  /** Asked to close — the owner decides (for example, confirm while a call is live). */
  onCloseRequest: () => void;
  /** What a minimized window keeps on show (e.g. call duration and controls). */
  minimized: ReactNode;
  children: ReactNode;
}

function placement(mode: FrameMode, rect: FrameRect): SxProps<Theme> {
  if (mode === 'maximized') return { inset: FRAME.gutter };
  if (mode === 'minimized') return { left: rect.x, top: rect.y, width: Math.min(rect.w, FRAME.defaultW) };
  return { left: rect.x, top: rect.y, width: rect.w, height: rect.h };
}

/**
 * A floating, non-modal window with Minimize, Maximize/Restore and Close.
 * The page behind stays usable. Content stays mounted in the owner, so
 * minimizing or maximizing never loses what the window shows.
 */
export default function FloatingWindow({ title, icon, onCloseRequest, minimized, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const hintId = useId();
  const frame = useFloatingFrame();
  const { mode } = frame;
  const isMin = mode === 'minimized';
  const isMax = mode === 'maximized';

  return (
    <Paper
      elevation={12}
      role="dialog"
      aria-modal={false}
      aria-labelledby={titleId}
      data-testid="call-window"
      data-mode={mode}
      sx={{
        position: 'fixed',
        zIndex: (theme) => theme.zIndex.modal,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 1.5,
        ...placement(mode, frame.rect),
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        tabIndex={0}
        aria-describedby={hintId}
        onPointerDown={frame.onTitlePointerDown}
        onKeyDown={frame.onTitleKeyDown}
        onDoubleClick={frame.toggleMaximize}
        data-testid="call-window-titlebar"
        sx={{
          alignItems: 'center',
          px: 1.5,
          py: 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          cursor: isMax ? 'default' : 'move',
          userSelect: 'none',
          touchAction: 'none',
          '&:focus-visible': { outline: 2, outlineColor: 'primary.contrastText', outlineOffset: -4 },
        }}
      >
        {icon}
        <Typography id={titleId} component="h2" variant="subtitle2" noWrap sx={{ fontWeight: 700, flex: 1 }}>
          {title}
        </Typography>
        <Box id={hintId} sx={{ display: 'none' }}>
          {t('crm.call.moveHint')}
        </Box>
        <Tooltip title={isMin ? t('crm.call.restore') : t('crm.call.minimize')}>
          <DuncitIconButton size="small" sx={{ color: 'inherit' }} onClick={frame.toggleMinimize} aria-label={isMin ? t('crm.call.restore') : t('crm.call.minimize')}>
            {isMin ? <OpenInFullIcon fontSize="small" /> : <MinimizeIcon fontSize="small" />}
          </DuncitIconButton>
        </Tooltip>
        {!isMin && (
          <Tooltip title={isMax ? t('crm.call.restore') : t('crm.call.maximize')}>
            <DuncitIconButton size="small" sx={{ color: 'inherit' }} onClick={frame.toggleMaximize} aria-label={isMax ? t('crm.call.restore') : t('crm.call.maximize')}>
              {isMax ? <FilterNoneIcon fontSize="small" /> : <CropSquareIcon fontSize="small" />}
            </DuncitIconButton>
          </Tooltip>
        )}
        <Tooltip title={t('shell.common.close')}>
          <DuncitIconButton size="small" sx={{ color: 'inherit' }} onClick={onCloseRequest} aria-label={t('shell.common.close')}>
            <CloseIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      </Stack>

      {isMin ? <Box sx={{ px: 1.5, py: 1 }}>{minimized}</Box> : <Box sx={{ p: 2, overflowY: 'auto', flex: 1, minHeight: 0 }}>{children}</Box>}

      {mode === 'normal' && (
        <Box
          aria-hidden
          data-testid="call-window-resize"
          onPointerDown={frame.onResizePointerDown}
          sx={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: (theme) => theme.spacing(2),
            height: (theme) => theme.spacing(2),
            cursor: 'nwse-resize',
            touchAction: 'none',
            borderRight: 2,
            borderBottom: 2,
            borderColor: 'divider',
          }}
        />
      )}
    </Paper>
  );
}
