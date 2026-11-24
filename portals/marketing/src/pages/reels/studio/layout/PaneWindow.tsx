import type { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import { DuncitButton } from '@duncit/buttons';
import { FloatingWindow, useTranslation, type WindowRect } from '@duncit/shell';
import type { PaneId, PaneState } from './layoutModel';

interface Props {
  pane: PaneState;
  title: string;
  onRect: (id: PaneId, rect: WindowRect) => void;
  onDock: () => void;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A pane popped out of the split view: the shell's floating window, dragged
 * by its bar, resized from its corner and minimised to the taskbar like any
 * other. Where it is left is remembered with the layout. Its close button
 * closes the pane; Dock back returns it to the split view.
 */
export default function PaneWindow({ pane, title, onRect, onDock, onClose, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const key = pane.id.toLowerCase();

  return (
    <FloatingWindow
      id={`reel-studio-${key}`}
      open
      title={title}
      subtitle={t('ai.reels.layout.windowSubtitle')}
      initial={{ x: pane.x, y: pane.y, width: pane.width, height: pane.height }}
      fill
      onRectChange={(rect) => onRect(pane.id, rect)}
      onClose={onClose}
    >
      <Stack sx={{ height: '100%', minHeight: 0 }} data-testid={`reel-pane-window-${key}`}>
        <Stack direction="row" sx={{ justifyContent: 'flex-end', px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
          <DuncitButton size="small" startIcon={<VerticalSplitIcon fontSize="small" />} onClick={onDock} data-testid={`reel-pane-dock-${key}`}>
            {t('ai.reels.layout.dock')}
          </DuncitButton>
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{children}</Box>
      </Stack>
    </FloatingWindow>
  );
}
