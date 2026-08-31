import { formResolver } from '../../../utils/form-resolver';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import type { GrievanceSupportTicketOption } from '@duncit/utils';
import { Button, Text, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { GrievanceField } from './GrievanceField';
import { GrievanceTicketField } from './GrievanceTicketField';
import { buildGrievanceSchema, grievanceDefaults, type GrievanceValues } from './grievance.types';

interface Props {
  submitting?: boolean;
  errorMessage?: string;
  /** The user's own support tickets — what this grievance can escalate. */
  tickets: GrievanceSupportTicketOption[];
  ticketsLoading?: boolean;
  onSubmit: (values: GrievanceValues) => void;
}

/**
 * Raise a grievance — the RN twin of mWeb's GrievanceForm.
 *
 * Same fields in the same order, same shared rules, same localization keys.
 * Only the widgets differ.
 *
 * Submitting is blocked while the user has no support ticket to point at: the
 * grievance desk is the step AFTER support, and a grievance with nothing behind
 * it is one the officer rejects.
 */
export function GrievanceForm({
  submitting,
  errorMessage,
  tickets,
  ticketsLoading,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  // Rebuilt when the language changes so the messages follow it.
  const schema = useMemo(() => buildGrievanceSchema(t), [t]);
  const noTickets = !ticketsLoading && tickets.length === 0;

  const { control, handleSubmit } = useForm<GrievanceValues, any, GrievanceValues>({
    defaultValues: grievanceDefaults,
    resolver: formResolver<GrievanceValues>(schema),
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
      <GrievanceTicketField control={control} options={tickets} loading={ticketsLoading} />
      <GrievanceField control={control} name="name" label={t('grievance.field.name')} required />
      <GrievanceField control={control} name="email" label={t('grievance.field.email')} required />
      <GrievanceField control={control} name="phone" label={t('grievance.field.phone')} required />
      <GrievanceField
        control={control}
        name="address"
        label={t('grievance.field.address')}
        hint={t('grievance.optional')}
        multiline
      />
      <GrievanceField
        control={control}
        name="subject"
        label={t('grievance.field.subject')}
        required
      />
      <GrievanceField
        control={control}
        name="description"
        label={t('grievance.field.description')}
        hint={t('grievance.descriptionHint')}
        required
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
        disabled={submitting || noTickets}
        color={onPrimary}
        onPress={handleSubmit(onSubmit)}
      >
        {submitting ? t('grievance.submitting') : t('grievance.submit')}
      </Button>
    </YStack>
  );
}
