import { Button, Chip, IconButton, Stack, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import NearMeIcon from '@mui/icons-material/NearMe';
import HighlightIcon from '@mui/icons-material/Highlight';
import EditIcon from '@mui/icons-material/Edit';
import LayersClearIcon from '@mui/icons-material/LayersClear';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import PanToolAltIcon from '@mui/icons-material/PanToolAlt';
import LockIcon from '@mui/icons-material/Lock';
import type { PointerTool } from './ShareStage';
import type { ControlState } from './useRemoteControl';

interface Props {
  /** True on the side whose screen is being shared. */
  amSharing: boolean;
  /** True when the other side is sharing — then there is nothing to start. */
  watching: boolean;
  onStart: () => void;
  tool: PointerTool;
  onTool: (tool: PointerTool) => void;
  onClear: () => void;
  onFullscreen: () => void;
  onStop: () => void;
  /** Sharer's side: somebody is asking to drive. */
  pendingRequest: boolean;
  theyControl: boolean;
  onGrant: () => void;
  onRevoke: () => void;
  /** Viewer's side. */
  myControl: ControlState;
  onRequest: () => void;
}

/**
 * What you can do to a shared screen.
 *
 * The two sides get different buttons on purpose: the viewer asks, the sharer
 * decides. Control is never taken — the grant is a deliberate act by the person
 * whose screen it is, and it can be pulled back in one click that is always on
 * screen while it is out.
 */
export default function ShareToolbar({
  amSharing,
  watching,
  onStart,
  tool,
  onTool,
  onClear,
  onFullscreen,
  onStop,
  pendingRequest,
  theyControl,
  onGrant,
  onRevoke,
  myControl,
  onRequest,
}: Readonly<Props>) {
  // Hoisted out of the JSX: a ternary inside a conditional branch inside the
  // return is three levels of nesting for one button.
  const controlAction =
    myControl === 'GRANTED' ? (
      <Chip size="small" color="success" icon={<PanToolAltIcon />} label="You have control" />
    ) : (
      <Button
        size="small"
        variant="outlined"
        startIcon={<PanToolAltIcon />}
        onClick={onRequest}
        disabled={myControl === 'REQUESTED'}
      >
        {myControl === 'REQUESTED' ? 'Asked…' : 'Request control'}
      </Button>
    );

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={tool}
        onChange={(_event, next) => next && onTool(next)}
      >
        <ToggleButton value="POINTER" aria-label="Pointer">
          <Tooltip title="Pointer">
            <NearMeIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="LASER" aria-label="Laser">
          <Tooltip title="Laser">
            <HighlightIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="DRAW" aria-label="Draw">
          <Tooltip title="Draw">
            <EditIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>

      <Tooltip title="Clear drawing">
        <IconButton size="small" onClick={onClear} aria-label="Clear drawing">
          <LayersClearIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Full screen">
        <IconButton size="small" onClick={onFullscreen} aria-label="Full screen share">
          <FullscreenIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {amSharing ? (
        <>
          {pendingRequest && !theyControl && (
            <Button size="small" variant="contained" startIcon={<PanToolAltIcon />} onClick={onGrant}>
              Give control
            </Button>
          )}
          {theyControl && (
            <Button size="small" color="error" variant="outlined" startIcon={<LockIcon />} onClick={onRevoke}>
              Revoke control
            </Button>
          )}
          <Button size="small" color="error" startIcon={<StopScreenShareIcon />} onClick={onStop}>
            Stop sharing
          </Button>
        </>
      ) : (
        <>
          {/* Nothing was ever wired to START a share, which is why control
              never worked: there was no screen to control. */}
          {!watching && (
            <Button
              size="small"
              variant="contained"
              startIcon={<ScreenShareIcon />}
              onClick={onStart}
            >
              Share this tab
            </Button>
          )}
          {watching && controlAction}
        </>
      )}
    </Stack>
  );
}
