import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Stack } from '@mui/material';
import RhfTextField from '../components/RhfTextField';
import { useTranslation } from '../../i18n/useTranslation';
import { buildGrievanceSchema, grievanceDefaults, type GrievanceValues } from './grievance.types';

interface Props {
  loading?: boolean;
  onSubmit: (values: GrievanceValues) => Promise<void> | void;
}

/**
 * Raise a grievance (RHF + Zod + MUI) — the mWeb twin of the native
 * GrievanceForm. Both build their rules from the same shared spec and render
 * the same localization keys, so the two forms accept and say the same things.
 */
export default function GrievanceForm({ loading, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Rebuilt when the language changes so the messages follow it.
  const schema = useMemo(() => buildGrievanceSchema(t), [t]);

  const { control, handleSubmit } = useForm<GrievanceValues>({
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
        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? t('grievance.submitting') : t('grievance.submit')}
        </Button>
      </Stack>
    </form>
  );
}
