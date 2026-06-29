import { useRef, useState, type ReactNode } from 'react';
import { Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AnimatePresence, MotiView } from 'moti';
import { YStack } from 'tamagui';

import { durations } from '@/animations/motion';

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
      <AnimatePresence>
        {burst ? (
          <YStack
            position="absolute"
            top={0}
            bottom={0}
            left={0}
            right={0}
            alignItems="center"
            justifyContent="center"
            pointerEvents="none"
          >
            <MotiView
              testID="reel-join-burst"
              from={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.3 }}
              transition={{ type: 'timing', duration: durations.fast }}
            >
              <MaterialIcons name="check-circle" size={104} color="#ffffff" />
            </MotiView>
          </YStack>
        ) : null}
      </AnimatePresence>
    </Pressable>
  );
}
