import { formResolver } from '../../../utils/form-resolver';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import type { GrievanceSupportTicketOption } from '@duncit/utils';
import { Text } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
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
  /** The signed-in account's contact details, once loaded. */
  prefill?: GrievanceValues;
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
  prefill,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Rebuilt when the language changes so the messages follow it.
  const schema = useMemo(() => buildGrievanceSchema(t), [t]);
  const noTickets = !ticketsLoading && tickets.length === 0;
  // What the account already answered is shown, not asked again: the person
  // the officer writes back to has to be the one signed in. A field the
  // account left blank (no phone or address on file yet) stays typeable, so a
  // required field is never a dead end.
  const fromAccount = (field: keyof GrievanceValues) =>
    prefill?.[field] ? { hint: t('grievance.fromAccount'), readOnly: true } : {};

  const { control, handleSubmit } = useForm<GrievanceValues, any, GrievanceValues>({
    defaultValues: grievanceDefaults,
    // Applied when the account arrives; anything already typed is kept.
    values: prefill,
    resetOptions: { keepDirtyValues: true },
    resolver: formResolver<GrievanceValues>(schema),
    mode: 'onTouched',
  });

  return (
    <SurfaceCard testID="grievance-form" gap={12}>
      <GrievanceTicketField control={control} options={tickets} loading={ticketsLoading} />
      <GrievanceField
        control={control}
        name="name"
        label={t('grievance.field.name')}
        required
        {...fromAccount('name')}
      />
      <GrievanceField
        control={control}
        name="email"
        label={t('grievance.field.email')}
        required
        {...fromAccount('email')}
      />
      <GrievanceField
        control={control}
        name="phone"
        label={t('grievance.field.phone')}
        required
        {...fromAccount('phone')}
      />
      <GrievanceField
        control={control}
        name="address"
        label={t('grievance.field.address')}
        hint={t('grievance.optional')}
        multiline
        {...fromAccount('address')}
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
        <Text role="alert" fontSize={12} color="$danger" testID="grievance-error">
          {errorMessage}
        </Text>
      ) : null}
      <DuncitButton
        testID="grievance-submit"
        size="lg"
        fullWidth
        disabled={submitting || noTickets}
        label={submitting ? t('grievance.submitting') : t('grievance.submit')}
        onPress={handleSubmit(onSubmit)}
      />
    </SurfaceCard>
  );
}
