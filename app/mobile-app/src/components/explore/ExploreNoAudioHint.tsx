import { useEffect } from 'react';
import { Text, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

/** How long the pill stays up before it clears itself. */
const HINT_MS = 2000;

interface Props {
  open: boolean;
  onClose: () => void;
  podId: string;
}

/** "This video has no audio" — a pill centred over the reel after a press on
 * the dimmed sound button. mWeb twin: ExploreNoAudioHint. */
export function ExploreNoAudioHint({ open, onClose, podId }: Readonly<Props>) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return undefined;
    const timer = globalThis.setTimeout(onClose, HINT_MS);
    return () => globalThis.clearTimeout(timer);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <YStack
      testID={`reel-no-audio-${podId}`}
      role="status"
      aria-live="polite"
      position="absolute"
      top={0}
      bottom={0}
      left={0}
      right={0}
      alignItems="center"
      justifyContent="center"
      pointerEvents="none"
    >
      <YStack
        paddingHorizontal={16}
        paddingVertical={8}
        borderRadius={999}
        backgroundColor="rgba(0,0,0,0.7)"
      >
        <Text color="$onPrimary" fontSize={14} fontWeight="600">
          {t('mweb.explore.noAudio')}
        </Text>
      </YStack>
    </YStack>
  );
}
