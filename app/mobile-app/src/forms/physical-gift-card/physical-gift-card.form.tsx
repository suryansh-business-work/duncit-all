import { useEffect, useMemo } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useForm } from 'react-hook-form';
import { Text } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  formatPhysicalGiftCardNumber,
  formatPhysicalGiftCardPasscode,
  makePhysicalGiftCardSchema,
  physicalGiftCardDefaults,
  type PhysicalGiftCardFormProps,
  type PhysicalGiftCardValues,
} from './physical-gift-card.types';

/**
 * A printed gift card's number and the passcode under its scratch panel, on the
 * number pad. The passcode box groups the digits `XXXX-XXXX-XXXX-XXXX` as they
 * are typed, the way the card prints them. RN twin of mWeb's
 * gift-card-redeem-page/physical-card-form — same rules, same copy.
 */
export function PhysicalGiftCardForm({ saving, errorMessage, onSubmit }: Readonly<PhysicalGiftCardFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makePhysicalGiftCardSchema(t), [t]);
  const { control, handleSubmit } = useForm<PhysicalGiftCardValues, any, PhysicalGiftCardValues>({
    defaultValues: physicalGiftCardDefaults,
    resolver: formResolver<PhysicalGiftCardValues>(schema),
    mode: 'onBlur',
  });

  // A refusal lands away from the reader's focus (the button), so it is spoken
  // as it arrives — the field lines do the same through <Field> (WCAG 4.1.3).
  useEffect(() => {
    if (errorMessage) AccessibilityInfo.announceForAccessibility(errorMessage);
  }, [errorMessage]);

  return (
    <SurfaceCard testID="gift-card-physical-form" gap={16}>
      <Text fontSize={14} color="$muted">
        {t('mweb.giftCards.physicalIntro')}
      </Text>
      <FormTextField
        control={control}
        name="card_number"
        required
        label={t('mweb.giftCards.cardNumberLabel')}
        hint={t('mweb.giftCards.cardNumberHint')}
        placeholder={t('mweb.giftCards.cardNumberPlaceholder')}
        keyboardType="number-pad"
        autoComplete="off"
        format={formatPhysicalGiftCardNumber}
      />
      <FormTextField
        control={control}
        name="passcode"
        required
        label={t('mweb.giftCards.passcodeLabel')}
        hint={t('mweb.giftCards.passcodeHint')}
        placeholder={t('mweb.giftCards.passcodePlaceholder')}
        keyboardType="number-pad"
        autoComplete="off"
        format={formatPhysicalGiftCardPasscode}
      />
      {errorMessage ? (
        <Text testID="gift-card-physical-error" role="alert" fontSize={13} color="$danger">
          {errorMessage}
        </Text>
      ) : null}
      <PrimaryButton
        testID="gift-card-physical-redeem"
        label={t('mweb.giftCards.redeemCta')}
        loading={saving}
        onPress={handleSubmit(onSubmit)}
      />
    </SurfaceCard>
  );
}
