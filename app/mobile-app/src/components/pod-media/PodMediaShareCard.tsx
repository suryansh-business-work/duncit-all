import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { PodMediaLabels } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { usePodMediaLinkActions } from '@/hooks/usePodLinkActions';
import { useThemeColors } from '@/hooks/useThemeColors';

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
  const { primary, onPrimary } = useThemeColors();
  const target = { id: pod.pod_id, pod_title: pod.pod_title };

  const fire = (action: (p: typeof target) => Promise<unknown>) => () => {
    // A dismissed share sheet rejects on iOS — that is the host closing it.
    action(target).catch(() => undefined);
  };

  return (
    <SurfaceCard gap={12}>
      <YStack gap={4}>
        <Text fontSize={16} fontWeight="600" color="$color">
          {labels.shareHeading}
        </Text>
        <Text fontSize={13} color="$muted" lineHeight={18}>
          {labels.shareBody}
        </Text>
      </YStack>
      <XStack gap={8} flexWrap="wrap">
        <DuncitButton
          testID="pod-media-share"
          label={labels.shareLink}
          onPress={fire(media.share)}
          size="sm"
          icon={<MaterialIcons name="ios-share" size={16} color={onPrimary} />}
        />
        <DuncitButton
          testID="pod-media-copy"
          label={labels.copyLink}
          onPress={fire(media.copy)}
          variant="outline"
          size="sm"
          icon={<MaterialIcons name="content-copy" size={16} color={primary} />}
        />
      </XStack>
    </SurfaceCard>
  );
}
