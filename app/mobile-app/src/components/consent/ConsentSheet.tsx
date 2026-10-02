import { useState } from 'react';
import { Linking } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { makeConsent } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { config } from '@/constants/config';
import { useTranslation } from '@/hooks/useTranslation';
import { useConsentStore } from '@/stores/consent.store';
import { fireAndForget } from '@/utils/fire-and-forget';
import { ConsentSwitches, type ConsentValues } from './ConsentSwitches';

const NOTHING: ConsentValues = { analytics: false, marketing: false };
const EVERYTHING: ConsentValues = { analytics: true, marketing: true };

/** The question is answered with a button, never by dismissing it. */
const STAY_OPEN = () => undefined;

const openPolicies = () => fireAndForget(Linking.openURL(`${config.mainSiteUrl}/policies`));

/**
 * The first-launch tracking question (GDPR / ePrivacy) — the Tamagui twin of
 * mWeb's ConsentBanner (rule 27).
 *
 * Shown once the stored choice has been read and there is none. "Reject all"
 * sits beside "Accept all" with the same weight, because consent is only valid
 * when refusing is as easy as agreeing, and the optional switches start OFF.
 */
export function ConsentSheet() {
  const { t } = useTranslation();
  const hydrated = useConsentStore((s) => s.hydrated);
  const choice = useConsentStore((s) => s.choice);
  const setChoice = useConsentStore((s) => s.setChoice);
  const [choosing, setChoosing] = useState(false);
  const [values, setValues] = useState<ConsentValues>(NOTHING);

  const save = (next: ConsentValues) => setChoice(makeConsent(next));

  const third = choosing ? (
    <DuncitButton
      testID="consent-save"
      label={t('privacy.banner.save')}
      variant="outline"
      fullWidth
      onPress={() => save(values)}
    />
  ) : (
    <DuncitButton
      testID="consent-customise"
      label={t('privacy.banner.customise')}
      variant="outline"
      fullWidth
      onPress={() => setChoosing(true)}
    />
  );

  const footer = (
    <YStack gap={8}>
      <XStack gap={8}>
        <YStack flex={1}>
          <DuncitButton
            testID="consent-accept-all"
            label={t('privacy.banner.acceptAll')}
            fullWidth
            onPress={() => save(EVERYTHING)}
          />
        </YStack>
        <YStack flex={1}>
          <DuncitButton
            testID="consent-reject-all"
            label={t('privacy.banner.rejectAll')}
            fullWidth
            onPress={() => save(NOTHING)}
          />
        </YStack>
      </XStack>
      {third}
    </YStack>
  );

  return (
    <DuncitDialog
      open={hydrated && choice === null}
      onClose={STAY_OPEN}
      testID="consent-banner"
      title={t('privacy.banner.title')}
      closeLabel={t('privacy.banner.label')}
      dismissOnBackdrop={false}
      showCloseButton={false}
      footer={footer}
    >
      <YStack gap={16}>
        <Text fontSize={14} color="$color" lineHeight={20}>
          {t('privacy.banner.body')}{' '}
          <Text
            pressStyle={PRESS_STYLE.inline}
            testID="consent-policy-link"
            hitSlop={12}
            role="link"
            color="$accent"
            fontWeight="600"
            textDecorationLine="underline"
            onPress={openPolicies}
          >
            {t('privacy.banner.policyLink')}
          </Text>
        </Text>
        {choosing ? (
          <ConsentSwitches
            values={values}
            onChange={(category, checked) =>
              setValues((prev) => ({ ...prev, [category]: checked }))
            }
          />
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
