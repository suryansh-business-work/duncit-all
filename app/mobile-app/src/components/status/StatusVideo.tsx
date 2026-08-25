import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

interface StatusVideoProps {
  uri: string;
  /** Sound state, owned by the viewer so its speaker button matches. */
  muted: boolean;
  /** Fired when the clip finishes so the viewer can advance to the next slide. */
  onEnded: () => void;
}

/**
 * Plays a story video with the app's own player — the same one the reels, the
 * splash, the sidebar card and the story preview sheet already use.
 *
 * It used to render a WebView around a `<video>` tag written into an HTML
 * string. That document has no origin of its own, so the remote clip was never
 * fetched and the slide sat black and silent; the tag was also hardcoded
 * `muted`, so a story's sound could not play even once the picture did.
 */
export function StatusVideo({ uri, muted, onEnded }: Readonly<StatusVideoProps>) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = muted;
    p.play();
  });
  // The viewer rebuilds `onEnded` on every render; holding it in a ref keeps
  // the listener below from being torn down and re-added each time.
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  // The viewer lives inside a Modal, where the setup-time play() can be
  // swallowed before the remote source finishes loading — re-assert play once
  // it reports ready (same as SidebarVenuesCard).
  useEffect(() => {
    const ready = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') player.play();
    });
    const ended = player.addListener('playToEnd', () => endedRef.current());
    return () => {
      ready.remove();
      ended.remove();
    };
  }, [player]);

  return (
    <VideoView
      testID="status-video"
      player={player}
      style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' }}
      contentFit="cover"
      nativeControls={false}
    />
  );
}
