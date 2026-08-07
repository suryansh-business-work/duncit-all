import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Text, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { GrievanceField } from './GrievanceField';
import { buildGrievanceSchema, grievanceDefaults, type GrievanceValues } from './grievance.types';

interface Props {
  submitting?: boolean;
  errorMessage?: string;
  onSubmit: (values: GrievanceValues) => void;
}

/**
 * Raise a grievance — the RN twin of mWeb's GrievanceForm.
 *
 * Same fields in the same order, same shared rules, same localization keys.
 * Only the widgets differ.
 */
export function GrievanceForm({ submitting, errorMessage, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  // Rebuilt when the language changes so the messages follow it.
  const schema = useMemo(() => buildGrievanceSchema(t), [t]);

  const { control, handleSubmit } = useForm<GrievanceValues>({
    defaultValues: grievanceDefaults,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  return (
    <YStack
      testID="grievance-form"
      gap={12}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <GrievanceField control={control} name="name" label={t('grievance.field.name')} />
      <GrievanceField control={control} name="email" label={t('grievance.field.email')} />
      <GrievanceField control={control} name="phone" label={t('grievance.field.phone')} />
      <GrievanceField
        control={control}
        name="address"
        label={t('grievance.field.address')}
        hint={t('grievance.optional')}
        multiline
      />
      <GrievanceField control={control} name="subject" label={t('grievance.field.subject')} />
      <GrievanceField
        control={control}
        name="description"
        label={t('grievance.field.description')}
        hint={t('grievance.descriptionHint')}
        multiline
      />
      {errorMessage ? (
        <Text fontSize={12} color="$danger" testID="grievance-error">
          {errorMessage}
        </Text>
      ) : null}
      <Button
        testID="grievance-submit"
        theme="active"
        borderRadius={12}
        disabled={submitting}
        color={onPrimary}
        onPress={handleSubmit(onSubmit)}
      >
        {submitting ? t('grievance.submitting') : t('grievance.submit')}
      </Button>
    </YStack>
  );
}
