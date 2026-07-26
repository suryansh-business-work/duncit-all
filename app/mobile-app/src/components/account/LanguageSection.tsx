import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { SetMyLocaleDocument } from '@/graphql/localization';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeColors } from '@/hooks/useThemeColors';
import { graphqlRequest } from '@/services/graphql.client';
import { useLocaleStore } from '@/stores/locale.store';

/**
 * Language preference. Switching re-renders the app immediately and persists to
 * the user's profile, so the choice follows them to mWeb and the portals.
 * Hidden when the platform offers fewer than two languages. Tamagui twin of
 * mWeb's LanguageSection.
 */
export function LanguageSection() {
  const { t, locale, setLocale } = useTranslation();
  const locales = useLocaleStore((s) => s.locales);
  const { primary, muted } = useThemeColors();
  const [saving, setSaving] = useState(false);

  if (locales.length < 2) return null;

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
    <YStack gap={10} testID="account-language-section">
      <Text fontSize={14} fontWeight="900" color="$color">
        {t('mweb.account.preferences')}
      </Text>
      <Text fontSize={12} color="$muted">
        {t('mweb.common.languageHint')}
      </Text>
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
              borderRadius={12}
              borderWidth={1}
              borderColor={selected ? '$primary' : '$borderColor'}
              backgroundColor="$background"
              pressStyle={{ opacity: 0.85 }}
            >
              <YStack>
                {/* The endonym leads, so someone who switched into a script they
                    cannot read can still recognise their own language. */}
                <Text fontSize={14} fontWeight="800" color="$color">
                  {option.label}
                </Text>
                {option.english_label ? (
                  <Text fontSize={11.5} color="$muted">
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
    </YStack>
  );
}
