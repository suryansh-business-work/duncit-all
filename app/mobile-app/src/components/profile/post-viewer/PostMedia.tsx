import { useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { YStack } from 'tamagui';

const DOUBLE_TAP_MS = 280;
const BURST_MS = 700;

interface Props {
  imageUrl: string;
  /** Liked only — double-tap never unlikes (Instagram-style). */
  onDoubleTapLike: () => void;
}

/** Post image with Instagram-style double-tap to like + a heart-burst overlay.
 * A single tap is a no-op; two taps within the window fire the like once. */
export function PostMedia({ imageUrl, onDoubleTapLike }: Readonly<Props>) {
  const lastTap = useRef(0);
  const [burst, setBurst] = useState(false);

  const onPress = () => {
    const now = Date.now();
    if (now - lastTap.current > DOUBLE_TAP_MS) {
      lastTap.current = now;
      return;
    }
    lastTap.current = 0;
    onDoubleTapLike();
    setBurst(true);
    setTimeout(() => setBurst(false), BURST_MS);
  };

  return (
    <Pressable testID="post-media" onPress={onPress}>
      <AppImage
        testID="post-viewer-image"
        source={{ uri: imageUrl }}
        style={{ width: '100%', height: 320 }}
        resizeMode="cover"
      />
      {burst ? (
        <YStack
          testID="post-like-burst"
          position="absolute"
          top={0}
          bottom={0}
          left={0}
          right={0}
          alignItems="center"
          justifyContent="center"
          pointerEvents="none"
        >
          <MaterialIcons name="favorite" size={110} color="#ffffff" />
        </YStack>
      ) : null}
    </Pressable>
  );
}
