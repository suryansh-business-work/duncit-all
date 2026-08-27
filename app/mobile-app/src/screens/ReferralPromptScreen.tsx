import { useState } from 'react';
import { Input, Text, YStack } from 'tamagui';
import { REFERRAL_CODE } from '@duncit/regex';

import { AuthScaffold } from '@/components/AuthScaffold';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useReferral } from '@/hooks/useReferral';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth.store';
import { PRESS_STYLE } from '@duncit/buttons-native';

/**
 * The referral question for accounts Google finished on its own. mWeb's twin.
 *
 * An email signup asks it on the form, where it can be checked before the
 * account exists. Google hands back a finished account instead, so the question
 * gets its own step — skippable, because a signup must never be held hostage to
 * a code the user does not have.
 */
export function ReferralPromptScreen() {
  const { t } = useTranslation();
  const dismiss = useAuthStore((s) => s.dismissReferralPrompt);
  // The same redemption path Refer & Earn used before the box moved here, so
  // there is still exactly one place a code is applied from on this surface.
  const { applyBusy, applyError, applyCode } = useReferral();
  const [code, setCode] = useState('');

  const trimmed = code.trim().toUpperCase();
  const malformed = trimmed !== '' && !REFERRAL_CODE.test(trimmed);

  const apply = async () => {
    const ok = await applyCode(trimmed);
    if (ok) dismiss();
  };

  return (
    <AuthScaffold
      testID="referral-prompt-screen"
      title={t('mweb.referral.promptTitle')}
      subtitle={t('mweb.referral.promptBodyPlain')}
    >
      <YStack gap={16}>
        <Input
          testID="referral-prompt-input"
          aria-label={t('mweb.referral.codeLabel')}
          size="$4"
          backgroundColor="$background"
          color="$color"
          placeholderTextColor="$muted"
          borderColor={malformed ? '$danger' : '$borderColor'}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={t('mweb.referral.codePlaceholder')}
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase())}
        />

        {malformed ? (
          <Text testID="referral-prompt-pattern" fontSize={12.5} color="$danger">
            {t('mweb.referral.validation.codePattern')}
          </Text>
        ) : null}
        {applyError ? (
          <Text testID="referral-prompt-error" fontSize={12.5} color="$danger">
            {applyError}
          </Text>
        ) : null}

        <PrimaryButton
          testID="referral-prompt-apply"
          label={t('mweb.referral.apply')}
          loading={applyBusy}
          disabled={!trimmed || malformed}
          onPress={() => void apply()}
        />
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="referral-prompt-skip"
          role="button"
          aria-label={t('mweb.referral.skip')}
          onPress={dismiss}
          textAlign="center"
          fontSize={14}
          fontWeight="600"
          color="$primary"
        >
          {t('mweb.referral.skip')}
        </Text>
      </YStack>
    </AuthScaffold>
  );
}
