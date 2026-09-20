import { Panel, useReactFlow } from '@xyflow/react';
import { Paper, Stack, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  fullScreen: boolean;
  onToggleFullScreen: () => void;
}

/**
 * Zoom, fit and full screen as MUI buttons: React Flow's own `<Controls>` are
 * a white block with no theme awareness and no accessible names.
 */
export default function CanvasControls({ fullScreen, onToggleFullScreen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const fullScreenLabel = fullScreen ? t('ai.automation.builder.exitFullScreen') : t('ai.automation.builder.fullScreen');
  const FullScreenIcon = fullScreen ? FullscreenExitIcon : FullscreenIcon;

  const controls = [
    { key: 'in', label: t('ai.automation.builder.zoomIn'), Icon: AddIcon, run: () => zoomIn({ duration: 200 }) },
    { key: 'out', label: t('ai.automation.builder.zoomOut'), Icon: RemoveIcon, run: () => zoomOut({ duration: 200 }) },
    { key: 'fit', label: t('ai.automation.builder.fitView'), Icon: CenterFocusStrongIcon, run: () => fitView({ padding: 0.2, duration: 300 }) },
    { key: 'full', label: fullScreenLabel, Icon: FullScreenIcon, run: onToggleFullScreen },
  ];

  return (
    <Panel position="bottom-left">
      <Paper variant="outlined" sx={{ p: 0.5, borderRadius: 2, bgcolor: 'background.paper' }}>
        <Stack direction="row" spacing={0.25}>
          {controls.map(({ key, label, Icon, run }) => (
            <Tooltip key={key} title={label}>
              <span>
                <DuncitIconButton size="small" aria-label={label} onClick={run} data-testid={`automation-canvas-${key}`}>
                  <Icon fontSize="small" />
                </DuncitIconButton>
              </span>
            </Tooltip>
          ))}
        </Stack>
      </Paper>
    </Panel>
  );
}
