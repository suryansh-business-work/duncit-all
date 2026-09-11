import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { SetMyLocaleDocument } from '@/graphql/localization';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeColors } from '@/hooks/useThemeColors';
import { graphqlRequest } from '@/services/graphql.client';
import { useLocaleStore } from '@/stores/locale.store';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Mirrors LANGUAGE_PREFERENCE_FLAG in @duncit/app-settings, which native cannot import. */
const LANGUAGE_PREFERENCE_FLAG = 'language_preference';

/**
 * Language preference. Switching re-renders the app immediately and persists to
 * the user's profile, so the choice follows them to mWeb and the portals.
 * Hidden while the language_preference flag is off or the platform offers fewer
 * than two languages. Tamagui twin of mWeb's LanguageSection.
 */
export function LanguageSection() {
  const { t, locale, setLocale } = useTranslation();
  const locales = useLocaleStore((s) => s.locales);
  const { primary, muted } = useThemeColors();
  const [saving, setSaving] = useState(false);
  const enabled = useFeatureFlag(LANGUAGE_PREFERENCE_FLAG);

  if (!enabled || locales.length < 2) return null;

  const pick = async (code: string) => {
    if (code === locale || saving) return;
    setSaving(true);
    // Switch the UI first — the language must change even if the profile write
    // fails; the local choice is persisted by the store regardless.
    await setLocale(code);
    try {
      await graphqlRequest(SetMyLocaleDocument, { locale: code }, { auth: true });
    } catch {
      // Best effort: the device keeps the choice and retries on next change.
    } finally {
      setSaving(false);
    }
  };

  return (
    <SurfaceCard gap={12} testID="account-language-section">
      <XStack alignItems="center" gap={8}>
        <Text accessibilityRole="header" flex={1} fontSize={17} fontWeight="600" color="$color">
          {t('mweb.account.preferences')}
        </Text>
        {saving ? <ActivityIndicator testID="language-saving" color={primary} /> : null}
      </XStack>
      <YStack gap={8}>
        {locales.map((option) => {
          const selected = option.code === locale;
          return (
            <XStack
              key={option.code}
              testID={`locale-option-${option.code}`}
              role="button"
              aria-label={option.label}
              onPress={() => pick(option.code)}
              alignItems="center"
              justifyContent="space-between"
              paddingHorizontal={14}
              paddingVertical={12}
              borderRadius={14}
              backgroundColor={selected ? '$primarySoft' : '$soft'}
              pressStyle={PRESS_STYLE.control}
            >
              <YStack>
                {/* The endonym leads, so someone who switched into a script they
                    cannot read can still recognise their own language. */}
                <Text fontSize={15} fontWeight="500" color="$color">
                  {option.label}
                </Text>
                {option.english_label ? (
                  <Text fontSize={12} color="$muted">
                    {option.english_label}
                  </Text>
                ) : null}
              </YStack>
              <MaterialIcons
                name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={20}
                color={selected ? primary : muted}
              />
            </XStack>
          );
        })}
      </YStack>
    </SurfaceCard>
  );
}
