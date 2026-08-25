import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { PodMediaLabels } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { PodMediaItem } from '@/hooks/usePodMediaBoard';

interface Props {
  items: readonly PodMediaItem[];
  labels: PodMediaLabels;
  /** Omitted on a read-only strip — the Complete dialog shows, it does not edit. */
  onRemove?: (url: string) => void;
  busy?: boolean;
}

/**
 * What is on the pod, as a grid of what it looks like. The Tamagui twin of
 * `@duncit/host-pod-actions`' PodMediaGrid (rule 27).
 *
 * Each tile says who added it, because a host looking at forty photos after an
 * evening is deciding whose to keep — and because a guest has to be able to
 * find their own to take it back down.
 */
export function PodMediaGrid({ items, labels, onRemove, busy = false }: Readonly<Props>) {
  const { color: ink, danger, muted } = useThemeColors();

  if (items.length === 0) {
    return (
      <Text testID="pod-media-empty" fontSize={13} color="$muted">
        {labels.empty}
      </Text>
    );
  }

  return (
    <XStack flexWrap="wrap" gap={8}>
      {items.map((item) => (
        <YStack key={item.url} width="48%" gap={4}>
          <YStack borderRadius={12} overflow="hidden" backgroundColor="$backgroundHover">
            <AppImage
              source={{ uri: item.url }}
              style={{ width: '100%', height: 120 }}
              recyclingKey={item.url}
              accessibilityLabel={labels.uploadedBy(item.uploaded_by_name)}
            />
            {onRemove && item.can_remove ? (
              <XStack
                testID={`pod-media-remove-${item.url}`}
                position="absolute"
                top={6}
                right={6}
                padding={6}
                borderRadius={999}
                backgroundColor="$background"
                opacity={busy ? 0.5 : 1}
                onPress={() => {
                  if (!busy) onRemove(item.url);
                }}
                accessibilityRole="button"
                accessibilityLabel={labels.remove}
              >
                <MaterialIcons name="delete-outline" size={16} color={danger} />
              </XStack>
            ) : null}
          </YStack>
          <XStack alignItems="center" gap={4}>
            <MaterialIcons
              name={item.source === 'HOST' ? 'person' : 'group'}
              size={12}
              color={item.source === 'HOST' ? ink : muted}
            />
            <Text fontSize={11} color="$muted" numberOfLines={1} flex={1}>
              {item.uploaded_by_name || (item.source === 'HOST' ? labels.byHost : labels.byGuest)}
            </Text>
          </XStack>
        </YStack>
      ))}
    </XStack>
  );
}
