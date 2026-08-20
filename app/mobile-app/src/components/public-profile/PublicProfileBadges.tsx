import { useState } from 'react';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { UserBadge } from '@/hooks/usePublicProfile';
import { formatDate } from '@/utils/date-format';

/** Badge grid with a details sheet — RN twin of mWeb's PublicProfileBadges. */
export function PublicProfileBadges({ badges }: Readonly<{ badges: UserBadge[] }>) {
  const { onPrimary, primary, color } = useThemeColors();
  const [active, setActive] = useState<UserBadge | null>(null);
  if (badges.length === 0) return null;

  return (
    <YStack
      testID="public-profile-badges"
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      padding={16}
      gap={12}
    >
      <XStack alignItems="center" gap={6}>
        <MaterialIcons name="emoji-events" size={18} color={primary} />
        <Text fontSize={15} fontWeight="700" color="$color">
          Badges
        </Text>
        <Text fontSize={12} color="$muted">
          ({badges.length})
        </Text>
      </XStack>
      <XStack flexWrap="wrap" gap={12}>
        {badges.map((item) => (
          <YStack
            key={item.id}
            testID={`badge-${item.id}`}
            role="button"
            aria-label={item.badge?.title ?? 'Badge'}
            onPress={() => setActive(item)}
            width={72}
            alignItems="center"
            gap={4}
            pressStyle={{ opacity: 0.85 }}
          >
            <YStack
              width={48}
              height={48}
              borderRadius={24}
              overflow="hidden"
              backgroundColor="$primary"
              alignItems="center"
              justifyContent="center"
            >
              {item.badge?.image_url ? (
                <AppImage
                  source={{ uri: item.badge.image_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons name="emoji-events" size={22} color={onPrimary} />
              )}
            </YStack>
            <Text fontSize={11} fontWeight="700" color="$color" numberOfLines={1}>
              {item.badge?.title}
            </Text>
          </YStack>
        ))}
      </XStack>

      {/* On DuncitDialog because `badge.description` is server free text: the
          sheet had no height cap and no scroller, so a long citation pushed the
          Close button off the bottom of the screen. */}
      <DuncitDialog
        open={!!active}
        onClose={() => setActive(null)}
        testID="badge-sheet"
        title={active?.badge?.title ?? ''}
        closeLabel="Close"
        footer={
          <XStack
            testID="badge-sheet-close"
            role="button"
            aria-label="Close"
            onPress={() => setActive(null)}
            height={44}
            alignItems="center"
            justifyContent="center"
            borderRadius={999}
            borderWidth={1}
            borderColor="$borderColor"
            pressStyle={{ opacity: 0.85 }}
          >
            <Text fontSize={14} fontWeight="600" color={color}>
              Close
            </Text>
          </XStack>
        }
      >
        <YStack gap={10} alignItems="center">
          <YStack
            width={64}
            height={64}
            borderRadius={32}
            overflow="hidden"
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            {active?.badge?.image_url ? (
              <AppImage
                source={{ uri: active.badge.image_url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <MaterialIcons name="emoji-events" size={30} color={onPrimary} />
            )}
          </YStack>
          {active?.badge?.description ? (
            <Text fontSize={13} color="$muted" textAlign="center">
              {active.badge.description}
            </Text>
          ) : null}
          {active?.awarded_at ? (
            <Text fontSize={12} color="$muted">
              Awarded {formatDate(active.awarded_at)}
            </Text>
          ) : null}
        </YStack>
      </DuncitDialog>
    </YStack>
  );
}
