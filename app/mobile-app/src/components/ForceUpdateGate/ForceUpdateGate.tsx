import { Linking, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { dark, light } from '@duncit/auth-tokens';
import { Text, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppVersionStore } from '@/stores/app-version.store';
import { useThemeStore } from '@/stores/theme.store';
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
  // Colours are selected from the SAME scheme source AppBackground uses
  // (`useThemeStore`), not Tamagui `$color` tokens — the two can desync for a
  // root-level overlay, which rendered the text invisible on the light backdrop.
  const scheme = useThemeStore((s) => s.scheme);
  const tokens = scheme === 'dark' ? dark : light;
  const info = useAppVersionStore((s) => s.data)?.appVersionInfo;
  const current = appVersion();
  const latest = info?.latest_version ?? '';
  // Computed unconditionally (before the guard) so the CTA URL is always defined
  // and the empty-server-value fallback stays reachable/tested.
  const storeUrl = info?.android_store_url || FALLBACK_STORE_URL;

  // The gate is a native app-store update prompt — the web build has no store
  // binary to update to, so it never blocks web. This also keeps localhost/web
  // development unblocked (the baked version trails the DB `latest_version`).
  /* istanbul ignore next -- jest runs a native platform, so this web short-circuit is never exercised */
  if (Platform.OS === 'web') return null;

  if (!isOutdated(current, latest)) return null;

  const openStore = () => {
    /* istanbul ignore next -- an OS-level open failure has no user-facing recovery */
    Linking.openURL(storeUrl).catch(() => undefined);
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
      backgroundColor={scheme === 'dark' ? '#100d18' : '#fff5f7'}
      alignItems="center"
      justifyContent="center"
      padding={28}
      gap={16}
    >
      <AppBackground />
      <MaterialIcons name="system-update" size={72} color={tokens.primary} />
      <Text
        testID="force-update-title"
        fontSize={24}
        fontWeight="800"
        color={tokens.ink}
        textAlign="center"
      >
        Update required
      </Text>
      <Text fontSize={15} lineHeight={22} color={tokens.muted} textAlign="center">
        This version is old. Update to the new version to start using the app.
      </Text>
      <Text testID="force-update-versions" fontSize={13} color={tokens.muted} textAlign="center">
        Current v{current} · Latest v{latest}
      </Text>
      <YStack width="100%" maxWidth={320} marginTop={8}>
        <PrimaryButton testID="force-update-cta" label="Update now" onPress={openStore} />
      </YStack>
    </YStack>
  );
}
