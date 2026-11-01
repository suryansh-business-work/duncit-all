import { Audio } from '@remotion/media';
import type { ReelAsset, ReelVoiceover } from '../types';

interface Props {
  voiceover: ReelVoiceover;
  /** The generated speech, found by the composition; silence without it. */
  asset: ReelAsset | undefined;
}

/**
 * The voiceover under the whole reel. Unlike the music it is not looped: it
 * was spoken for this script, and a second pass of it would say the opening
 * again under the close.
 */
export function VoiceoverTrack({ voiceover, asset }: Readonly<Props>) {
  if (!asset) return null;
  return <Audio src={asset.url} volume={voiceover.volume} />;
}
