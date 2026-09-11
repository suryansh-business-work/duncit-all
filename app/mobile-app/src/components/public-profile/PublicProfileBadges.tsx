import { useState } from 'react';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { UserBadge } from '@/hooks/usePublicProfile';
import { formatDate } from '@/utils/date-format';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Badge grid with a details sheet — RN twin of mWeb's PublicProfileBadges. */
export function PublicProfileBadges({ badges }: Readonly<{ badges: UserBadge[] }>) {
  const { t } = useTranslation();
  const { accent, color } = useThemeColors();
  const [active, setActive] = useState<UserBadge | null>(null);
  if (badges.length === 0) return null;

  return (
    <SurfaceCard testID="public-profile-badges" gap={12}>
      <XStack alignItems="baseline" gap={6}>
        <Text accessibilityRole="header" fontSize={17} fontWeight="600" color="$color">
          Badges
        </Text>
        <Text fontSize={12} fontWeight="500" color="$muted">
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
            pressStyle={PRESS_STYLE.control}
          >
            <YStack
              width={56}
              height={56}
              borderRadius={28}
              overflow="hidden"
              backgroundColor="$soft"
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
                <MaterialIcons name="emoji-events" size={26} color={accent} />
              )}
            </YStack>
            <Text fontSize={13} fontWeight="600" color="$color" numberOfLines={1}>
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
            aria-label={t('mweb.common.close')}
            onPress={() => setActive(null)}
            height={44}
            alignItems="center"
            justifyContent="center"
            borderRadius={999}
            backgroundColor="$soft"
            pressStyle={PRESS_STYLE.control}
          >
            <Text fontSize={14} fontWeight="600" color={color}>
              Close
            </Text>
          </XStack>
        }
      >
        <YStack gap={10} alignItems="center">
          <YStack
            width={72}
            height={72}
            borderRadius={36}
            overflow="hidden"
            backgroundColor="$soft"
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
              <MaterialIcons name="emoji-events" size={32} color={accent} />
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
    </SurfaceCard>
  );
}
