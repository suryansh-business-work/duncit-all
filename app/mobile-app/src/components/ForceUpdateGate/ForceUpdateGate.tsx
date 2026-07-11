import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppVersionStore } from '@/stores/app-version.store';
import { appVersion } from '@/utils/app-version';
import { isOutdated } from '@/utils/semver';

/**
 * Last-resort store URL used only if the server sends a blank one — the real URL
 * comes from the `appVersionInfo` query. This is config (rule: a fallback store
 * URL constant is acceptable), not business data.
 */
const FALLBACK_STORE_URL = 'https://play.google.com/store/apps/details?id=com.duncit.mobile';

/**
 * Full-screen, NON-DISMISSABLE force-update gate. Renders over the whole app
 * (absolute inset + high zIndex, modelled on <SplashOverlay/>) whenever the
 * running build is behind the server's `latest_version`; otherwise it renders
 * null and the app passes through untouched. There is no close/skip — the block
 * is intentional and covers everything below it.
 *
 * CAVEAT: the DB `latest_version` is bumped on every deploy, but the Play Store
 * build publishes on its own cadence. This gate blocks purely on the DB value —
 * so if the DB is ahead of the currently-published Play Store build, users see
 * the block with no update yet available. This is the chosen product behaviour.
 */
export function ForceUpdateGate() {
  const colors = useThemeColors();
  const info = useAppVersionStore((s) => s.data)?.appVersionInfo;
  const current = appVersion();
  const latest = info?.latest_version ?? '';
  // Computed unconditionally (before the guard) so the CTA URL is always defined
  // and the empty-server-value fallback stays reachable/tested.
  const storeUrl = info?.android_store_url || FALLBACK_STORE_URL;

  if (!isOutdated(current, latest)) return null;

  const openStore = () => {
    void Linking.openURL(storeUrl);
  };

  return (
    <YStack
      testID="force-update-gate"
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={10000}
      backgroundColor="$background"
      alignItems="center"
      justifyContent="center"
      padding={28}
      gap={16}
    >
      <AppBackground />
      <MaterialIcons name="system-update" size={72} color={colors.primary} />
      <Text
        testID="force-update-title"
        fontSize={24}
        fontWeight="800"
        color="$color"
        textAlign="center"
      >
        Update required
      </Text>
      <Text fontSize={15} lineHeight={22} color="$muted" textAlign="center">
        This version is old. Update to the new version to start using the app.
      </Text>
      <Text testID="force-update-versions" fontSize={13} color="$muted" textAlign="center">
        Current v{current} · Latest v{latest}
      </Text>
      <YStack width="100%" maxWidth={320} marginTop={8}>
        <PrimaryButton testID="force-update-cta" label="Update now" onPress={openStore} />
      </YStack>
    </YStack>
  );
}
