import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import type { GrievanceSupportTicketOption } from '@duncit/utils';
import RhfTextField from '../components/RhfTextField';
import SupportTicketField from './SupportTicketField';
import { useTranslation } from '../../i18n/useTranslation';
import { buildGrievanceSchema, grievanceDefaults, type GrievanceValues } from './grievance.types';

interface Props {
  loading?: boolean;
  /** The user's own support tickets — what this grievance can escalate. */
  tickets: GrievanceSupportTicketOption[];
  ticketsLoading?: boolean;
  onSubmit: (values: GrievanceValues) => Promise<void> | void;
}

/**
 * Raise a grievance (RHF + Zod + MUI) — the mWeb twin of the native
 * GrievanceForm. Both build their rules from the same shared spec and render
 * the same localization keys, so the two forms accept and say the same things.
 *
 * Submitting is blocked while the user has no support ticket to point at: the
 * grievance desk is the step AFTER support, and a grievance with nothing behind
 * it is one the officer rejects.
 */
export default function GrievanceForm({
  loading,
  tickets,
  ticketsLoading,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Rebuilt when the language changes so the messages follow it.
  const schema = useMemo(() => buildGrievanceSchema(t), [t]);
  const noTickets = !ticketsLoading && tickets.length === 0;

  const { control, handleSubmit } = useForm<GrievanceValues, any, GrievanceValues>({
    defaultValues: grievanceDefaults,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('grievance.failed'));
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <SupportTicketField control={control} options={tickets} loading={ticketsLoading} />
        <RhfTextField control={control} name="name" label={t('grievance.field.name')} required />
        <RhfTextField control={control} name="email" label={t('grievance.field.email')} required />
        <RhfTextField control={control} name="phone" label={t('grievance.field.phone')} required />
        <RhfTextField
          control={control}
          name="address"
          label={t('grievance.field.address')}
          hint={t('grievance.optional')}
          multiline
          minRows={2}
        />
        <RhfTextField
          control={control}
          name="subject"
          label={t('grievance.field.subject')}
          required
        />
        <RhfTextField
          control={control}
          name="description"
          label={t('grievance.field.description')}
          hint={t('grievance.descriptionHint')}
          required
          multiline
          minRows={4}
        />
        {submitError && <Alert severity="error">{submitError}</Alert>}
        <DuncitButton type="submit" variant="contained" disabled={loading || noTickets}>
          {loading ? t('grievance.submitting') : t('grievance.submit')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
