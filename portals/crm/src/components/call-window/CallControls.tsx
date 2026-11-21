import { Stack, Tooltip } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CallEndIcon from '@mui/icons-material/CallEnd';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ControlAction } from './callSession.types';

interface Props {
  muted: boolean;
  onHold: boolean;
  /** Mute and hold need a connected call; End works from the first ring. */
  connected: boolean;
  busy: ControlAction | null;
  onControl: (action: ControlAction) => void;
  /** Icon-only buttons for the minimized window. */
  compact?: boolean;
}

/** Mute / Hold / End call. A control in flight disables them all, so a double click never sends two. */
export default function CallControls({ muted, onHold, connected, busy, onControl, compact }: Readonly<Props>) {
  const { t } = useTranslation();
  const locked = busy !== null;
  const muteLabel = muted ? t('crm.call.unmute') : t('crm.call.mute');
  const holdLabel = onHold ? t('crm.call.resume') : t('crm.call.hold');
  const endLabel = busy === 'END' ? t('crm.call.ending') : t('crm.call.endCall');
  const size = compact ? 'small' : 'medium';

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
      <Tooltip title={connected ? '' : t('crm.call.controlsHint')}>
        <span>
          <DuncitButton
            size={size}
            variant={muted ? 'contained' : 'outlined'}
            startIcon={muted ? <MicOffIcon /> : <MicIcon />}
            onClick={() => onControl(muted ? 'UNMUTE' : 'MUTE')}
            disabled={!connected || locked}
            aria-pressed={muted}
            aria-label={muteLabel}
          >
            {compact ? null : muteLabel}
          </DuncitButton>
        </span>
      </Tooltip>
      {!compact && (
        <Tooltip title={connected ? '' : t('crm.call.controlsHint')}>
          <span>
            <DuncitButton
              size={size}
              variant={onHold ? 'contained' : 'outlined'}
              color="warning"
              startIcon={onHold ? <PlayArrowIcon /> : <PauseIcon />}
              onClick={() => onControl(onHold ? 'RESUME' : 'HOLD')}
              disabled={!connected || locked}
              aria-pressed={onHold}
            >
              {holdLabel}
            </DuncitButton>
          </span>
        </Tooltip>
      )}
      <DuncitButton size={size} variant="contained" color="error" startIcon={<CallEndIcon />} onClick={() => onControl('END')} disabled={locked} aria-label={endLabel}>
        {compact ? null : endLabel}
      </DuncitButton>
    </Stack>
  );
}
