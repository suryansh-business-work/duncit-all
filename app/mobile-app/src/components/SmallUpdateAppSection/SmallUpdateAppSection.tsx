import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { radii } from '@duncit/auth-tokens';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DuncitButton } from '@/components/DuncitButton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useBottomNavSpace } from '@/hooks/useBottomNavSpace';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { useSmallUpdateApp } from './useSmallUpdateApp';

const ICON_SIZE = 20;

function SmallUpdateAppSectionContent() {
  const { t } = useTranslation();
  const { accent, muted } = useThemeColors();
  // Floats just above the bottom nav, never over it, and is mounted with the
  // tabs only — pushed screens and navigation stay untouched.
  const bottom = useBottomNavSpace(8);
  const { visible, latest, openStore, dismiss } = useSmallUpdateApp();
  if (!visible) return null;

  const title = t('mweb.smallUpdateAppSection.title');
  return (
    <YStack
      testID="small-update-app-section"
      role="region"
      aria-label={title}
      position="absolute"
      left="$3"
      right="$3"
      bottom={bottom}
      backgroundColor="$surface"
      borderRadius={radii.lg}
      borderWidth={1}
      borderColor="$cardBorder"
      paddingVertical="$2"
      paddingHorizontal="$3"
    >
      <XStack gap="$3" alignItems="center">
        <MaterialIcons name="system-update" size={ICON_SIZE} color={accent} aria-hidden />
        <YStack flex={1} minWidth={0}>
          <Text fontSize="$4" fontWeight="700" color="$color">
            {title}
          </Text>
          <Text fontSize="$3" color="$muted">
            {t('mweb.smallUpdateAppSection.body', { vars: { version: latest } })}
          </Text>
        </YStack>
        <DuncitButton
          testID="small-update-app-section-update"
          label={t('mweb.smallUpdateAppSection.update')}
          accessibilityHint={t('mweb.smallUpdateAppSection.updateHint')}
          onPress={openStore}
          size="sm"
        />
        <XStack
          testID="small-update-app-section-close"
          role="button"
          tabIndex={0}
          aria-label={t('mweb.smallUpdateAppSection.dismiss')}
          hitSlop={12}
          onPress={dismiss}
          pressStyle={PRESS_STYLE.control}
        >
          <MaterialIcons name="close" size={ICON_SIZE} color={muted} />
        </XStack>
      </XStack>
    </YStack>
  );
}

/**
 * "Small Update App Section" — a slim, non-blocking card above the bottom nav
 * when a newer app release is out (Update opens this platform's store listing;
 * X hides it until the next release). The soft sibling of ForceUpdateGate,
 * behind its own feature flag. Its own boundary, so a fault here never takes
 * the tabs down.
 */
export function SmallUpdateAppSection() {
  return (
    <ErrorBoundary>
      <SmallUpdateAppSectionContent />
    </ErrorBoundary>
  );
}
