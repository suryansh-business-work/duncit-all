import { useRef, useState } from 'react';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import { useTranslation } from '@duncit/app-settings';
import { notifyError } from '@duncit/dialogs';
import { intelLog } from '../../../lib/logger';
import { transcribeAudio } from '../../../lib/rest';

type MicState = 'idle' | 'recording' | 'transcribing';

/**
 * Speak a question: records in the browser (MediaRecorder) and transcribes on
 * the server, so every browser behaves the same and Hindi/Hinglish work too.
 */
export default function MicButton({ onText, disabled }: Readonly<{ onText: (text: string) => void; disabled?: boolean }>) {
  const { t } = useTranslation();
  const [state, setState] = useState<MicState>('idle');
  const recorder = useRef<MediaRecorder | null>(null);

  const start = async () => {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      notifyError(t('intel.composer.micUnsupported'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setState('transcribing');
        try {
          const text = await transcribeAudio(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
          if (text) onText(text);
          else notifyError(t('intel.composer.micNothing'));
        } catch (error) {
          intelLog.warn('/', 'MicButton', { error });
          notifyError(t('intel.composer.micFailed'));
        } finally {
          setState('idle');
        }
      };
      recorder.current = rec;
      rec.start();
      setState('recording');
    } catch (error) {
      intelLog.warn('/', 'MicButton', { error });
      notifyError(t('intel.composer.micDenied'));
    }
  };

  const stop = () => recorder.current?.stop();
  const label = state === 'recording' ? t('intel.composer.micStop') : t('intel.composer.mic');
  let icon = <MicIcon fontSize="small" />;
  if (state === 'recording') icon = <StopIcon fontSize="small" />;
  if (state === 'transcribing') icon = <CircularProgress size={18} />;

  return (
    <Tooltip title={label}>
      <span>
        <IconButton aria-label={label} aria-pressed={state === 'recording'} color={state === 'recording' ? 'error' : 'default'} disabled={disabled || state === 'transcribing'} onClick={state === 'recording' ? stop : start} size="small">
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}
