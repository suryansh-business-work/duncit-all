import { useCallback, useState } from 'react';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import type { ExploreAction } from './ExploreActionRail';
import { useTranslation } from '../../i18n/useTranslation';

interface Params {
  podId: string;
  /** False only when the server confirmed the reel has no audio track. */
  hasAudio: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
}

/** The reel rail's mute toggle. A reel without an audio track keeps the button,
 * dimmed, and a tap on it says why rather than toggling. Native twin:
 * useReelSoundAction. */
export function useReelSoundAction({ podId, hasAudio, soundOn, onToggleSound }: Readonly<Params>) {
  const { t } = useTranslation();
  const [noAudioOpen, setNoAudioOpen] = useState(false);
  const audible = hasAudio && soundOn;
  let label = t('mweb.explore.unmute');
  if (!hasAudio) label = t('mweb.explore.noAudio');
  else if (audible) label = t('mweb.explore.mute');

  const action: ExploreAction = {
    key: 'sound',
    testId: `reel-sound-${podId}`,
    icon: audible ? <VolumeUpIcon /> : <VolumeOffIcon />,
    label,
    ariaLabel: label,
    onClick: hasAudio ? onToggleSound : () => setNoAudioOpen(true),
    dimmed: !hasAudio,
  };
  // Stable, so the hint's auto-hide timer is not restarted by every card render.
  const closeNoAudio = useCallback(() => setNoAudioOpen(false), []);
  return { action, audible, noAudioOpen, closeNoAudio };
}
