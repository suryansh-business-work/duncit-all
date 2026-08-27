import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { PodMediaLabels } from '@duncit/utils';

import { usePodMediaLinkActions } from '@/hooks/usePodLinkActions';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  pod: { pod_id: string; pod_title: string };
  labels: PodMediaLabels;
}

/**
 * The host's half of the screen: the link that lets the people who came add
 * their own photos.
 *
 * The SAME link the pod's ⋮ sheet hands out — both go through
 * `usePodMediaLinkActions`, so a host who copies it here and shares it there
 * sends one address, and the short link behind it is minted once per pod.
 */
export function PodMediaShareCard({ pod, labels }: Readonly<Props>) {
  const media = usePodMediaLinkActions();
  const { primary, onPrimary, color: ink } = useThemeColors();
  const target = { id: pod.pod_id, pod_title: pod.pod_title };

  const fire = (action: (p: typeof target) => Promise<unknown>) => () => {
    // A dismissed share sheet rejects on iOS — that is the host closing it.
    action(target).catch(() => undefined);
  };

  return (
    <YStack gap={8} padding={12} borderRadius={16} borderWidth={1} borderColor="$borderColor">
      <Text fontSize={13.5} fontWeight="700">
        {labels.shareHeading}
      </Text>
      <Text fontSize={12.5} color="$muted">
        {labels.shareBody}
      </Text>
      <XStack gap={8}>
        <XStack
          pressStyle={PRESS_STYLE.control}
          testID="pod-media-share"
          alignItems="center"
          gap={6}
          paddingHorizontal={14}
          paddingVertical={8}
          borderRadius={999}
          backgroundColor={primary}
          onPress={fire(media.share)}
          accessibilityRole="button"
          accessibilityLabel={labels.shareLink}
        >
          <MaterialIcons name="ios-share" size={16} color={onPrimary} />
          <Text fontSize={13} fontWeight="700" color={onPrimary}>
            {labels.shareLink}
          </Text>
        </XStack>
        <XStack
          pressStyle={PRESS_STYLE.control}
          testID="pod-media-copy"
          alignItems="center"
          gap={6}
          paddingHorizontal={14}
          paddingVertical={8}
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
          onPress={fire(media.copy)}
          accessibilityRole="button"
          accessibilityLabel={labels.copyLink}
        >
          <MaterialIcons name="content-copy" size={16} color={ink} />
          <Text fontSize={13} fontWeight="700">
            {labels.copyLink}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
