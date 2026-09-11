import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { PodMediaLabels } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { PodMediaItem } from '@/hooks/usePodMediaBoard';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Square tiles, like the mWeb grid's 1:1 cells. */
const TILE_IMAGE = { width: '100%', aspectRatio: 1 } as const;

interface Props {
  items: readonly PodMediaItem[];
  labels: PodMediaLabels;
  /** Omitted on a read-only strip — the Complete dialog shows, it does not edit. */
  onRemove?: (url: string) => void;
  busy?: boolean;
}

/** Who added a tile — the host in the brand green, a guest in ink. */
function SourcePill({ host, label }: Readonly<{ host: boolean; label: string }>) {
  return (
    <XStack
      height={22}
      paddingHorizontal={8}
      alignItems="center"
      borderRadius={999}
      borderWidth={1}
      borderColor={host ? '$primary' : '$borderColor'}
    >
      <Text fontSize={11} fontWeight="600" color={host ? '$primary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
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
  const { danger } = useThemeColors();

  if (items.length === 0) {
    return (
      <Text testID="pod-media-empty" fontSize={14} color="$muted">
        {labels.empty}
      </Text>
    );
  }

  return (
    <XStack flexWrap="wrap" gap={8}>
      {items.map((item) => (
        <YStack key={item.url} width="48%" gap={6}>
          <YStack borderRadius={16} overflow="hidden" backgroundColor="$soft">
            <AppImage
              source={{ uri: item.url }}
              style={TILE_IMAGE}
              recyclingKey={item.url}
              accessibilityLabel={labels.uploadedBy(item.uploaded_by_name)}
            />
            {onRemove && item.can_remove ? (
              <XStack
                pressStyle={PRESS_STYLE.control}
                testID={`pod-media-remove-${item.url}`}
                position="absolute"
                top={6}
                right={6}
                width={32}
                height={32}
                alignItems="center"
                justifyContent="center"
                borderRadius={999}
                backgroundColor="$surface"
                opacity={busy ? 0.5 : 1}
                onPress={() => {
                  if (!busy) onRemove(item.url);
                }}
                accessibilityRole="button"
                accessibilityLabel={labels.remove}
              >
                <MaterialIcons name="delete-outline" size={18} color={danger} />
              </XStack>
            ) : null}
          </YStack>
          <XStack alignItems="center" gap={6}>
            <SourcePill
              host={item.source === 'HOST'}
              label={item.source === 'HOST' ? labels.byHost : labels.byGuest}
            />
            <Text fontSize={12} color="$muted" numberOfLines={1} flex={1}>
              {item.uploaded_by_name}
            </Text>
          </XStack>
        </YStack>
      ))}
    </XStack>
  );
}
