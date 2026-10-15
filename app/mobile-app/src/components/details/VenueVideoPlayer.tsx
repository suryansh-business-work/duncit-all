import { Linking } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import { Text, YStack } from 'tamagui';
import type { FileVideo, VenueVideo, YoutubeVideo } from '@duncit/forms/schemas';

import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  video: VenueVideo;
  /** What the player is called for a screen reader ("Video 1 of Paneer Tikka"). */
  title: string;
  testID: string;
}

const FRAME = { width: '100%', aspectRatio: 16 / 9 } as const;

/** A YouTube link: YouTube's privacy-enhanced embed, and a link out to the YouTube app. */
function YoutubePlayer({
  video,
  title,
  testID,
}: Readonly<{ video: YoutubeVideo; title: string; testID: string }>) {
  const { t } = useTranslation();
  return (
    <YStack gap={6} testID={testID}>
      <YStack
        style={FRAME}
        borderRadius={12}
        overflow="hidden"
        backgroundColor="$color"
        aria-label={title}
      >
        <WebView
          source={{ uri: video.embedUrl }}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          style={{ flex: 1 }}
        />
      </YStack>
      <Text
        role="link"
        fontSize={13}
        fontWeight="600"
        color="$primary"
        onPress={() => fireAndForget(Linking.openURL(video.watchUrl))}
        testID={`${testID}-open`}
      >
        {t('mweb.venueFood.watchOnYoutube')}
      </Text>
    </YStack>
  );
}

/** An uploaded clip: the stored file (never a metered re-encode), with the platform's own controls. */
function FilePlayer({
  video,
  title,
  testID,
}: Readonly<{ video: FileVideo; title: string; testID: string }>) {
  const player = useVideoPlayer(video.sourceUrl);
  return (
    <YStack
      style={FRAME}
      borderRadius={12}
      overflow="hidden"
      backgroundColor="$color"
      aria-label={title}
    >
      <VideoView
        testID={testID}
        player={player}
        style={{ flex: 1 }}
        contentFit="contain"
        nativeControls
      />
    </YStack>
  );
}

/**
 * One venue or dish video — nothing plays until the guest presses play.
 * Tamagui twin of mWeb's components/media/VenueVideoPlayer.
 */
export function VenueVideoPlayer({ video, title, testID }: Readonly<Props>) {
  return video.kind === 'YOUTUBE' ? (
    <YoutubePlayer video={video} title={title} testID={testID} />
  ) : (
    <FilePlayer video={video} title={title} testID={testID} />
  );
}
