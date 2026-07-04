import { useRef, useState, type ReactNode } from 'react';
import { Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { YStack } from 'tamagui';

const DOUBLE_TAP_MS = 280;
const BURST_MS = 700;

interface Props {
  onJoin: () => void;
  testID?: string;
  children: ReactNode;
}

/** Wraps the reel media so a double-tap fires the Join action (same as the Go
 * button) with a check-burst confirmation. A single tap is a no-op; horizontal
 * swipes still reach the inner media carousel. (Explore item 7.) */
export function DoubleTapJoin({ onJoin, testID, children }: Readonly<Props>) {
  const lastTap = useRef(0);
  const [burst, setBurst] = useState(false);

  const onPress = () => {
    const now = Date.now();
    if (now - lastTap.current > DOUBLE_TAP_MS) {
      lastTap.current = now;
      return;
    }
    lastTap.current = 0;
    onJoin();
    setBurst(true);
    setTimeout(() => setBurst(false), BURST_MS);
  };

  return (
    <Pressable testID={testID} onPress={onPress}>
      {children}
      {burst ? (
        <YStack
          testID="reel-join-burst"
          position="absolute"
          top={0}
          bottom={0}
          left={0}
          right={0}
          alignItems="center"
          justifyContent="center"
          pointerEvents="none"
        >
          <MaterialIcons name="check-circle" size={104} color="#ffffff" />
        </YStack>
      ) : null}
    </Pressable>
  );
}
