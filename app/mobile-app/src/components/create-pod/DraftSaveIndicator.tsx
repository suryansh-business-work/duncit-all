import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack } from 'tamagui';
import type { DraftSaveStatus } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

const LABEL_KEYS = {
  saving: 'mweb.createPod.autosave.saving',
  saved: 'mweb.createPod.autosave.saved',
  error: 'mweb.createPod.autosave.error',
} as const;

const ICON_NAMES = { saved: 'cloud-done', error: 'cloud-off' } as const;

/**
 * The draft's save state in the header corner: Saving, Saved, or that it could
 * not save (it retries by itself). Small and muted, it fades between states and
 * never takes a tap; a screen reader hears each change politely. mWeb twin:
 * pages/create-pod-page/DraftSaveIndicator.
 */
export function DraftSaveIndicator({ status }: Readonly<{ status: DraftSaveStatus }>) {
  const { t } = useTranslation();
  const { muted, danger } = useThemeColors();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    opacity.setValue(0.25);
    const fade = Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true });
    fade.start();
    return () => fade.stop();
  }, [status, opacity]);

  if (status === 'idle') return null;
  const failed = status === 'error';
  const color = failed ? danger : muted;
  return (
    <Animated.View
      testID="draft-save-indicator"
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{ opacity }}
    >
      <XStack alignItems="center" gap="$2">
        {status === 'saving' ? (
          <Spinner size="small" color={color} />
        ) : (
          <MaterialIcons name={ICON_NAMES[status]} size={14} color={color} />
        )}
        <Text fontSize="$2" color={failed ? '$danger' : '$muted'} numberOfLines={1}>
          {t(LABEL_KEYS[status])}
        </Text>
      </XStack>
    </Animated.View>
  );
}
