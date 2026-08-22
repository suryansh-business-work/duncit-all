import { Linking, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { dark, light } from '@duncit/auth-tokens';
import { Text, YStack } from 'tamagui';

import { AppBackground, DARK, LIGHT } from '@/components/AppBackground';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useAppVersionStore } from '@/stores/app-version.store';
import { useFeatureFlagsStore } from '@/stores/feature-flags.store';
import { useThemeStore } from '@/stores/theme.store';
import { appVersion } from '@/utils/app-version';
import { isOutdated } from '@/utils/semver';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Last-resort store URL used only if the server sends a blank one — the real URL
 * comes from the `appVersionInfo` query. This is config (rule: a fallback store
 * URL constant is acceptable), not business data.
 */
const FALLBACK_STORE_URL = 'https://play.google.com/store/apps/details?id=com.duncit.mobile';

/**
 * Tech Portal -> Feature Flags -> "Force App Update". ON (the seeded default)
 * enforces the update screen; OFF lets an outdated build keep running. Read at
 * runtime from the server, so flipping it takes effect without an app release.
 */
const FORCE_APP_UPDATE_FLAG = 'force_app_update';

/**
 * Full-screen, NON-DISMISSABLE force-update gate. Renders over the whole app
 * (absolute inset + high zIndex, modelled on <SplashOverlay/>) whenever the
 * running build is older than the server's `min_supported_version`; otherwise it
 * renders null and the app passes through untouched. There is no close/skip —
 * the block is intentional and covers everything below it.
 *
 * The Tech Portal's "Force App Update" flag is the master switch: with it OFF,
 * an outdated build is never blocked.
 *
 * It gates on `min_supported_version`, NOT `latest_version`. `latest_version`
 * is auto-synced from app.json on every deploy, and the store build publishes
 * on its own cadence — gating on it meant a push could block users out of a
 * build that did not exist to download yet. `min_supported_version` is raised
 * by hand (Admin → Branding) once a release is actually live, so the block can
 * only ever point at a version users can install. Blank — which is what a fresh
 * database holds — blocks nobody.
 */
export function ForceUpdateGate() {
  const { t } = useTranslation();
  // Colours are selected from the SAME scheme source AppBackground uses
  // (`useThemeStore`), not Tamagui `$color` tokens — the two can desync for a
  // root-level overlay, which rendered the text invisible on the light backdrop.
  const scheme = useThemeStore((s) => s.scheme);
  const tokens = scheme === 'dark' ? dark : light;
  const info = useAppVersionStore((s) => s.data)?.appVersionInfo;
  // The kill-switch. `true` is the fallback so a database that predates the
  // seed still enforces, and `flagsLoaded` holds the gate back until the real
  // answer lands — otherwise an app with the flag OFF flashes the block for as
  // long as the flags take to arrive.
  const enforced = useFeatureFlag(FORCE_APP_UPDATE_FLAG, true);
  const flagsLoaded = useFeatureFlagsStore((s) => s.data !== undefined);
  const current = appVersion();
  // The floor an admin set, never the auto-bumped latest — see the note above.
  const minSupported = info?.min_supported_version ?? '';
  // Shown, not compared: the newest release is what the user is being sent to get.
  const latest = info?.latest_version ?? '';
  // Computed unconditionally (before the guard) so the CTA URL is always defined
  // and the empty-server-value fallback stays reachable/tested.
  const storeUrl = info?.android_store_url || FALLBACK_STORE_URL;

  // The gate is a native app-store update prompt — the web build has no store
  // binary to update to, so it never blocks web. This also keeps localhost/web
  // development unblocked (the baked version trails the DB `latest_version`).
  /* istanbul ignore next -- jest runs a native platform, so this web short-circuit is never exercised */
  if (Platform.OS === 'web') return null;

  // Same fail-safe stance as an unreachable `appVersionInfo`: no answer from the
  // server means nobody gets locked out.
  if (!flagsLoaded || !enforced) return null;

  if (!isOutdated(current, minSupported)) return null;

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
      backgroundColor={scheme === 'dark' ? DARK[0] : LIGHT[0]}
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
        fontWeight="600"
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
        <PrimaryButton
          testID="force-update-cta"
          label={t('mweb.forceUpdateGate.updateNow')}
          onPress={openStore}
        />
      </YStack>
    </YStack>
  );
}
