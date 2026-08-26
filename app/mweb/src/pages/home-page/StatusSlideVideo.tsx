import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { videoSourceUrl } from '@duncit/utils';

interface Props {
  src: string;
  /** Press-and-hold pauses the story — the clip has to hold with it. */
  paused: boolean;
  /** Sound state, owned by the viewer so its speaker button matches. */
  muted: boolean;
  /** The browser refused unmuted autoplay — the viewer flips its toggle. */
  onBlocked: () => void;
  onTimeUpdate: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  onEnded: () => void;
  /** The clip could not load — the viewer moves on instead of holding a black slide. */
  onError: () => void;
}

/**
 * A story slide's video.
 *
 * The `autoPlay` attribute on its own was not enough here: the viewer mounts
 * inside a Dialog portal, so the element's own autoplay attempt is made before
 * the remote clip has anything to show and is simply dropped — which left the
 * slide black, silent and frozen, since the progress bar is driven by
 * `timeupdate`. play() is called (and re-called on every source change) from
 * here instead, and a clip the browser refuses to start with sound is started
 * muted so the story still runs; the viewer's speaker button then says so.
 *
 * play() is wrapped in Promise.resolve because jsdom's returns undefined.
 *
 * The src goes through `videoSourceUrl` so the clip is fetched as the stored
 * file: ImageKit's metered re-encode answers 403 once its allowance is spent,
 * and a 403 is the other way this slide goes black.
 */
export default function StatusSlideVideo({
  src,
  paused,
  muted,
  onBlocked,
  onTimeUpdate,
  onEnded,
  onError,
}: Readonly<Props>) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const source = videoSourceUrl(src);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = muted;
    Promise.resolve(video.play()).catch(() => {
      // Chrome and Safari only autoplay a muted clip. Start it muted and tell
      // the viewer, so one tap on the speaker brings the sound back.
      video.muted = true;
      onBlocked();
      Promise.resolve(video.play()).catch(() => undefined);
    });
  }, [source, muted, onBlocked]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (paused) video.pause();
    else Promise.resolve(video.play()).catch(() => undefined);
  }, [paused]);

  return (
    <Box
      component="video"
      ref={ref}
      src={source}
      data-testid="status-slide-video"
      autoPlay
      playsInline
      preload="auto"
      onTimeUpdate={onTimeUpdate}
      onEnded={onEnded}
      onError={onError}
      sx={{ width: '100%', height: '100%', objectFit: 'cover', bgcolor: 'common.black' }}
    />
  );
}
