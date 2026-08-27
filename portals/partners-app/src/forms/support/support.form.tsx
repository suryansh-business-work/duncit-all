import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, MenuItem, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField, zodRules } from '@duncit/forms';
import { supportCategories, supportInitialValues, type SupportFormValues } from './support.types';
import { useTranslation } from '@duncit/shell';

// The schema only needs the VALUES, and those never translate — pass an
// identity translator rather than requiring a hook at module scope.
const CATEGORY_VALUES = supportCategories((key: string) => key).map((item) => item.value) as [SupportFormValues['category'], ...SupportFormValues['category'][]];

type Translate = ReturnType<typeof useTranslation>['t'];

/** Messages are copy, so the schema is built from the active catalogue. */
export const buildSupportSchema = (t: Translate) =>
  z.object({
  name: zodRules.personName('Name'),
  email: zodRules.email('Email', { lengthFirst: true }),
  category: z.enum(CATEGORY_VALUES, { errorMap: () => ({ message: t('partners.forms.selectAValidCategory') }) }),
  subject: zodRules.requiredText('Subject', 3, 120),
  message: zodRules.requiredText('Message', 10, 2000),
});

interface Props {
  initialValues?: Partial<SupportFormValues>;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: SupportFormValues) => Promise<void> | void;
}

export default function SupportForm({ initialValues, loading, errorMessage, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const defaults = { ...supportInitialValues, ...initialValues };
  const { control, register, handleSubmit, reset, setError, formState } = useForm<SupportFormValues>({
    resolver: zodResolver(buildSupportSchema(t)),
    defaultValues: defaults,
    mode: 'onBlur',
  });
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    reset({ ...supportInitialValues, ...initialValues });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues?.name, initialValues?.email, initialValues?.category, initialValues?.subject, initialValues?.message]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('partners.forms.couldNotSubmitSupportRequest');
      setError('root', { message });
    }
  });

  const categoryError = Boolean(errors.category);
  const rootError = errors.root?.message;

  return (
    <Stack component="form" noValidate onSubmit={submit} spacing={2}>
      <RhfTextField control={control} name="name" label={t('partners.forms.yourName')} required autoComplete="name" />
      <RhfTextField control={control} name="email" label={t('shell.common.email')} type="email" autoComplete="email" disabled slotProps={{ input: { readOnly: true } }} hint={t('partners.becomeHostPage.lockedToYourDuncitAccount')} />
      <TextField select label={t('partners.common.category')} defaultValue={defaults.category} error={categoryError} helperText={categoryError ? errors.category?.message : ' '} fullWidth {...register('category')}>
        {supportCategories(t).map((category) => <MenuItem key={category.value} value={category.value}>{category.label}</MenuItem>)}
      </TextField>
      <RhfTextField control={control} name="subject" label={t('partners.forms.subject')} required />
      <RhfTextField control={control} name="message" label={t('partners.forms.message')} required multiline minRows={4} hint="At least 10 characters" />
      {(errorMessage ?? rootError) && <Alert severity="error">{errorMessage ?? rootError}</Alert>}
      <DuncitButton type="submit" variant="contained" size="large" disabled={loading || isSubmitting}>{loading || isSubmitting ? 'Sending...' : 'Send to support'}</DuncitButton>
    </Stack>
  );
}

export function toContactInput(values: SupportFormValues) {
  const payload = buildSupportSchema((key: string) => key).parse(values);
  return { name: payload.name, email: payload.email, subject: `[${payload.category}] ${payload.subject}`, message: payload.message };
}
