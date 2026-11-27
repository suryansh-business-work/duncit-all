import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { XStack, useTheme } from 'tamagui';
import { tokens } from '@duncit/theme/tokens';

import { MOBILE } from '@/constants/design';
import { haptics } from '@/services/haptics';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** What it switches, for screen readers. */
  label: string;
  disabled?: boolean;
  testID?: string;
}

/** Material 3's switch: a 52 × 32 track, a knob of 16 off and 24 on that slides across. */
const TRACK = { width: 52, height: 32, border: 2 } as const;
const KNOB_ON = 24;
const KNOB_OFF = 16;
/** The knob's square travels this far across the track's inside. */
const TRAVEL = TRACK.width - TRACK.border * 2 - (TRACK.height - TRACK.border * 2);

/**
 * The Duncit CRM switch — the one on/off control every screen uses. On: the
 * red track with a white knob. Off: an outlined track with a smaller muted
 * knob, so the two states read apart in light and dark mode. The knob slides
 * and grows on the native driver; a light haptic tick confirms the change.
 * (Tamagui's Switch with a border placed its knob off the track.)
 */
export function Toggle({ checked, onChange, label, disabled = false, testID }: Readonly<Props>) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(checked ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: checked ? 1 : 0,
      duration: tokens.motion.fast,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [checked, progress]);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, TRAVEL] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [KNOB_OFF / KNOB_ON, 1] });
  const inside = TRACK.height - TRACK.border * 2;

  return (
    <XStack
      accessible
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      aria-label={label}
      onPress={
        disabled
          ? undefined
          : () => {
              haptics.tap();
              onChange(!checked);
            }
      }
      hitSlop={(MOBILE.touch - TRACK.height) / 2}
      width={TRACK.width}
      height={TRACK.height}
      borderRadius={TRACK.height / 2}
      borderWidth={TRACK.border}
      borderColor={checked ? '$primary' : '$muted'}
      backgroundColor={checked ? '$primary' : '$soft'}
      alignItems="center"
      opacity={disabled ? 0.4 : 1}
      testID={testID}
    >
      <Animated.View
        style={{
          width: inside,
          height: inside,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateX }],
        }}
      >
        <Animated.View
          style={{
            width: KNOB_ON,
            height: KNOB_ON,
            borderRadius: KNOB_ON / 2,
            backgroundColor: checked ? theme.onPrimary?.val : theme.muted?.val,
            transform: [{ scale }],
          }}
        />
      </Animated.View>
    </XStack>
  );
}
