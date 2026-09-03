import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import RhfTextField from '../../../forms/components/RhfTextField';
import {
  makeVenueCancelPodSchema,
  venueCancelPodDefaults,
  type VenueCancelPodValues,
} from './venue-cancel-pod.types';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  /** The dialog's submit button lives outside the form and targets it by id. */
  formId: string;
  onSubmit: (values: VenueCancelPodValues) => Promise<void>;
}

/**
 * The reason field of the cancel-pod dialog (RHF + Zod + MUI). A failed
 * mutation lands on the form's root error, under the field, rather than in a
 * toast the owner may have already dismissed.
 */
export default function VenueCancelPodForm({ formId, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeVenueCancelPodSchema(t), [t]);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<VenueCancelPodValues, any, VenueCancelPodValues>({
    defaultValues: venueCancelPodDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<
      VenueCancelPodValues,
      any,
      VenueCancelPodValues
    >,
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      setError('root', { message: parseApiError(error) });
    }
  });

  return (
    <Stack component="form" id={formId} noValidate onSubmit={submit} spacing={1.5}>
      <RhfTextField
        control={control}
        name="reason"
        label={t('mweb.venuePods.reason')}
        required
        multiline
        minRows={3}
      />
      {errors.root?.message && <Alert severity="error">{errors.root.message}</Alert>}
    </Stack>
  );
}
