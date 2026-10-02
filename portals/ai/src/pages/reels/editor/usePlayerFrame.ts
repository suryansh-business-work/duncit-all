import { useEffect, useState } from 'react';
import type { CallbackListener, PlayerRef } from '@remotion/player';

/**
 * The frame the preview is showing, kept current while it plays or is scrubbed —
 * what the timeline's playhead follows. `player` is null until the preview has a
 * reel to play, and the subscription starts once it appears.
 */
export function usePlayerFrame(player: PlayerRef | null): number {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!player) return undefined;
    setFrame(player.getCurrentFrame());
    const onFrame: CallbackListener<'frameupdate'> = (event) => setFrame(event.detail.frame);
    const onSeek: CallbackListener<'seeked'> = (event) => setFrame(event.detail.frame);
    player.addEventListener('frameupdate', onFrame);
    player.addEventListener('seeked', onSeek);
    return () => {
      player.removeEventListener('frameupdate', onFrame);
      player.removeEventListener('seeked', onSeek);
    };
  }, [player]);
  return frame;
}
