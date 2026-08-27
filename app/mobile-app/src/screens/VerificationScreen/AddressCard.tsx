import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  addressValuesFrom,
  buildAddressInput,
  isVerificationLocked,
  makeAddressSchema,
  type AddressValues,
} from '@duncit/verification';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import type { AddressInput, Verification } from '@/hooks/useVerifications';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { VerificationCard } from './VerificationCard';

interface Props {
  item: Verification;
  busy: boolean;
  onSubmit: (values: AddressInput) => void;
}

/** Address verification — structured manual form (State / City / Pincode / line)
 * instead of a document upload. Approved and under-review rows are read-only.
 *
 * The schema, the prefill and the input builder come from @duncit/verification,
 * so this form and mWeb's MUI card accept exactly the same addresses. */
export function AddressCard({ item, busy, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const schema = useMemo(() => makeAddressSchema(t), [t]);
  const { control, handleSubmit } = useForm<AddressValues>({
    resolver: zodResolver(schema),
    defaultValues: addressValuesFrom(item),
  });
  const locked = isVerificationLocked(item.status);

  const submit = handleSubmit((values) => onSubmit(buildAddressInput(values)));
  const submitLabel =
    item.status === 'NOT_SUBMITTED'
      ? t('verification.submitAddress')
      : t('verification.updateAddress');

  return (
    <VerificationCard item={item}>
      {locked ? null : (
        <YStack gap={12}>
          <FormTextField
            control={control}
            name="state"
            label={t('verification.state')}
            placeholder={t('verification.statePlaceholder')}
            required
          />
          <FormTextField
            control={control}
            name="city"
            label={t('verification.city')}
            placeholder={t('verification.cityPlaceholder')}
            required
          />
          <FormTextField
            control={control}
            name="pincode"
            label={t('verification.pincode')}
            placeholder={t('verification.pincodePlaceholder')}
            keyboardType="number-pad"
            required
          />
          <FormTextField
            control={control}
            name="line1"
            label={t('verification.line1')}
            placeholder={t('verification.line1Placeholder')}
            required
          />
          <FormTextField
            control={control}
            name="line2"
            label={t('verification.line2')}
            placeholder={t('verification.line2Placeholder')}
          />
          <FormTextField
            control={control}
            name="country"
            label={t('verification.country')}
            placeholder={t('verification.countryPlaceholder')}
          />
          <XStack
            testID="verification-submit-address"
            role="button"
            aria-label={t('verification.submitAddress')}
            aria-disabled={busy}
            onPress={busy ? undefined : submit}
            alignItems="center"
            justifyContent="center"
            gap={8}
            height={46}
            borderRadius={12}
            backgroundColor="$primary"
            opacity={busy ? 0.6 : 1}
            pressStyle={PRESS_STYLE.control}
          >
            {busy ? <Spinner testID="address-busy" size="small" color={onPrimary} /> : null}
            <Text fontSize={14} fontWeight="700" color={onPrimary}>
              {submitLabel}
            </Text>
          </XStack>
        </YStack>
      )}
    </VerificationCard>
  );
}
