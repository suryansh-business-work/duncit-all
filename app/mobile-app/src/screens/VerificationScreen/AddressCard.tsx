import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import type { AddressInput, Verification } from '@/hooks/useVerifications';
import { useThemeColors } from '@/hooks/useThemeColors';

import { VerificationCard } from './VerificationCard';
import {
  addressSchema,
  blankAddressValues,
  buildAddressInput,
  type AddressValues,
} from './address.form';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  item: Verification;
  busy: boolean;
  onSubmit: (values: AddressInput) => void;
}

function prefill(address: Verification['address']): AddressValues {
  if (!address) return blankAddressValues;
  return {
    line1: address.line1 ?? '',
    line2: address.line2 ?? '',
    city: address.city ?? '',
    state: address.state ?? '',
    pincode: address.pincode ?? '',
    country: address.country ?? '',
  };
}

/** Address verification — structured manual form (State / City / Pincode / line)
 * instead of a document upload. Approved rows are read-only. */
export function AddressCard({ item, busy, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const { control, handleSubmit } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: prefill(item.address),
  });
  // Approved is finished; under review is somebody else's turn. Editing the
  // address mid-review means the admin approves one address having read
  // another. The server refuses the submission either way. mWeb twin.
  const done = item.status === 'APPROVED' || item.status === 'PENDING';

  const submit = handleSubmit((values) => onSubmit(buildAddressInput(values)));

  return (
    <VerificationCard item={item}>
      {done ? null : (
        <YStack gap={12}>
          <FormTextField
            control={control}
            name="state"
            label={t('mweb.common.state')}
            placeholder={t('mweb.verification.eGMaharashtra')}
            required
          />
          <FormTextField
            control={control}
            name="city"
            label={t('mweb.common.city')}
            placeholder={t('mweb.verification.eGMumbai')}
            required
          />
          <FormTextField
            control={control}
            name="pincode"
            label={t('mweb.common.pincode')}
            placeholder={t('mweb.verification.eG400001')}
            keyboardType="number-pad"
            required
          />
          <FormTextField
            control={control}
            name="line1"
            label={t('mweb.common.addressLine1')}
            placeholder={t('mweb.verification.houseStreet')}
            required
          />
          <FormTextField
            control={control}
            name="line2"
            label={t('mweb.verification.addressLine2Optional')}
            placeholder={t('mweb.verification.apartmentLandmark')}
          />
          <FormTextField
            control={control}
            name="country"
            label={t('mweb.verification.countryOptional')}
            placeholder={t('mweb.verification.eGIndia')}
          />
          <XStack
            testID="verification-submit-address"
            role="button"
            aria-label={t('mweb.verification.submitAddress')}
            aria-disabled={busy}
            onPress={busy ? undefined : submit}
            alignItems="center"
            justifyContent="center"
            gap={8}
            height={46}
            borderRadius={12}
            backgroundColor="$primary"
            opacity={busy ? 0.6 : 1}
            pressStyle={{ opacity: 0.85 }}
          >
            {busy ? <Spinner testID="address-busy" size="small" color={onPrimary} /> : null}
            <Text fontSize={14} fontWeight="700" color={onPrimary}>
              {item.status === 'NOT_SUBMITTED' ? 'Submit address' : 'Update address'}
            </Text>
          </XStack>
        </YStack>
      )}
    </VerificationCard>
  );
}
