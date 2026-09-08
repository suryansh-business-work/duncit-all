import { Panel, useReactFlow } from '@xyflow/react';
import { Paper, Stack, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n';
import { clearViewport } from './useRegionView';

interface Props {
  fullScreen: boolean;
  onToggleFullScreen: () => void;
}

/**
 * Zoom, fit, reset and full screen — our own buttons, not React Flow's.
 *
 * `<Controls>` renders plain white chrome with its own stylesheet: on this
 * portal's dark theme it was a white-on-white block in the corner, which is
 * what "the plus icon is not showing" was. These are MUI buttons on a MUI
 * surface, so they follow the theme in both modes and carry real tooltips and
 * accessible names.
 */
export default function CanvasControls({ fullScreen, onToggleFullScreen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const resetView = () => {
    clearViewport();
    fitView({ padding: 0.2, duration: 300 });
  };

  const fullScreenLabel = fullScreen
    ? t('partners.regional.exitFullScreen')
    : t('partners.regional.fullScreen');

  return (
    <Panel position="bottom-left">
      <Paper
        variant="outlined"
        sx={{ p: 0.5, borderRadius: 2, bgcolor: 'background.paper', boxShadow: 2 }}
      >
        <Stack direction="row" spacing={0.25}>
          <Tooltip title={t('partners.regional.zoomIn')}>
            <span>
              <DuncitIconButton
                size="small"
                aria-label={t('partners.regional.zoomIn')}
                onClick={() => zoomIn({ duration: 200 })}
              >
                <AddIcon fontSize="small" />
              </DuncitIconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('partners.regional.zoomOut')}>
            <span>
              <DuncitIconButton
                size="small"
                aria-label={t('partners.regional.zoomOut')}
                onClick={() => zoomOut({ duration: 200 })}
              >
                <RemoveIcon fontSize="small" />
              </DuncitIconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('partners.regional.fitView')}>
            <span>
              <DuncitIconButton
                size="small"
                aria-label={t('partners.regional.fitView')}
                onClick={() => fitView({ padding: 0.2, duration: 300 })}
              >
                <CenterFocusStrongIcon fontSize="small" />
              </DuncitIconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('partners.regional.resetView')}>
            <span>
              <DuncitIconButton
                size="small"
                aria-label={t('partners.regional.resetView')}
                onClick={resetView}
              >
                <RestartAltIcon fontSize="small" />
              </DuncitIconButton>
            </span>
          </Tooltip>
          <Tooltip title={fullScreenLabel}>
            <span>
              <DuncitIconButton
                size="small"
                aria-label={fullScreenLabel}
                onClick={onToggleFullScreen}
              >
                {fullScreen ? (
                  <FullscreenExitIcon fontSize="small" />
                ) : (
                  <FullscreenIcon fontSize="small" />
                )}
              </DuncitIconButton>
            </span>
          </Tooltip>
        </Stack>
      </Paper>
    </Panel>
  );
}
