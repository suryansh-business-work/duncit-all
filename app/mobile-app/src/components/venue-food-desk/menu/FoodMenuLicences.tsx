import { Linking } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { FOOD_LIQUOR_LICENCE_MAX } from '@duncit/forms/schemas';
import type { FoodMenuFormValues } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

const FSSAI_LENGTH = 14;

const DOCUMENTS = [
  { field: 'food_licences.fssai_document_url', key: 'venueFoodOwner.licences.fssaiDocument' },
  { field: 'food_licences.liquor_document_url', key: 'venueFoodOwner.licences.liquorDocument' },
] as const;

/** A licence document uploaded from the web console — open it, or remove it. Nothing while there is none. */
function LicenceDocumentRow({
  name,
  url,
  onRemove,
}: Readonly<{ name: string; url: string; onRemove: () => void }>) {
  const { t } = useTranslation();
  if (!url) return null;
  return (
    <XStack alignItems="center" justifyContent="space-between" gap={8}>
      <Text
        flex={1}
        role="link"
        fontSize={13}
        color="$primary"
        onPress={() => fireAndForget(Linking.openURL(url))}
      >
        {t('venueFoodOwner.licences.documentView', { vars: { name } })}
      </Text>
      <DuncitButton
        label={t('venueFoodOwner.common.delete')}
        accessibilityLabel={t('venueFoodOwner.licences.documentRemove', { vars: { name } })}
        variant="ghost"
        tone="danger"
        size="sm"
        onPress={onRemove}
      />
    </XStack>
  );
}

/**
 * The FSSAI licence number (printed at the foot of the public menu and on food
 * invoices) and the optional liquor licence number. A licence document uploaded
 * from the web console can be opened or removed here. Tamagui twin of
 * @duncit/venue-food's FoodLicenceFields.
 */
export function FoodMenuLicences({ control }: Readonly<{ control: Control<FoodMenuFormValues> }>) {
  const { t } = useTranslation();

  return (
    <YStack gap={10} testID="food-menu-licences">
      <Text role="heading" fontSize={15} fontWeight="700" color="$color">
        {t('venueFoodOwner.licences.title')}
      </Text>
      <Text fontSize={12} color="$muted">
        {t('venueFoodOwner.licences.intro')}
      </Text>
      <FormTextField
        control={control}
        name="food_licences.fssai_number"
        label={t('venueFoodOwner.licences.fssai')}
        hint={t('venueFoodOwner.licences.fssaiHint')}
        keyboardType="number-pad"
        maxLength={FSSAI_LENGTH}
      />
      <FormTextField
        control={control}
        name="food_licences.liquor_licence_number"
        label={t('venueFoodOwner.licences.liquor')}
        maxLength={FOOD_LIQUOR_LICENCE_MAX}
      />
      {DOCUMENTS.map(({ field, key }) => (
        <Controller
          key={field}
          control={control}
          name={field}
          render={({ field: { value, onChange } }) => (
            <LicenceDocumentRow name={t(key)} url={value} onRemove={() => onChange('')} />
          )}
        />
      ))}
    </YStack>
  );
}
