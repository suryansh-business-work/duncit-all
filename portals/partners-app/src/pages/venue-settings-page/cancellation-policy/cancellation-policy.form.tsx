import { useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import CancellationTierRow from './CancellationTierRow';
import {
  cancellationPolicySchema,
  emptyTier,
  type CancellationPolicyValues,
  type SubmitCancellationPolicy,
} from './cancellation-policy.types';

export interface CancellationPolicyFormProps {
  initialValues: CancellationPolicyValues;
  saving: boolean;
  error: string | null;
  t: (key: string) => string;
  onSubmit: SubmitCancellationPolicy;
}

/**
 * The venue's cancellation policy: any number of bands, plus the switch that
 * takes cancelling off the table altogether. Turning that switch on greys the
 * bands out rather than deleting them — they come back if it goes off again.
 */
export default function CancellationPolicyForm({
  initialValues,
  saving,
  error,
  t,
  onSubmit,
}: Readonly<CancellationPolicyFormProps>) {
  const { control, handleSubmit, reset, watch } = useForm<CancellationPolicyValues, any, CancellationPolicyValues>({
    defaultValues: initialValues,
    resolver: zodResolver(cancellationPolicySchema),
    mode: 'onTouched',
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'tiers' });
  const rescheduleOnly = watch('reschedule_only');

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name="reschedule_only"
        render={({ field }) => (
          <FormControlLabel
            control={<Checkbox checked={field.value} onChange={field.onChange} />}
            label={t('partners.venueSettingsPage.rescheduleOnly')}
          />
        )}
      />
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('partners.venueSettingsPage.rescheduleOnlyHint')}
      </Typography>

      <Divider />

      {rescheduleOnly ? (
        <Alert severity="info">{t('partners.venueSettingsPage.policyDisabled')}</Alert>
      ) : null}

      <Typography variant="subtitle2">{t('partners.venueSettingsPage.bandsTitle')}</Typography>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('partners.venueSettingsPage.bandsHint')}
      </Typography>

      {fields.length === 0 ? (
        <Alert severity="success">{t('partners.venueSettingsPage.noBands')}</Alert>
      ) : null}

      {fields.map((row, index) => (
        <CancellationTierRow
          key={row.id}
          control={control}
          index={index}
          disabled={rescheduleOnly}
          onRemove={() => remove(index)}
          t={t}
        />
      ))}

      <Stack direction="row" spacing={1.5}>
        <DuncitButton
          startIcon={<AddIcon />}
          onClick={() => append(emptyTier)}
          disabled={rescheduleOnly}
        >
          {t('partners.venueSettingsPage.addBand')}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={submit} disabled={saving}>
          {saving ? t('partners.venueSettingsPage.saving') : t('partners.venueSettingsPage.save')}
        </DuncitButton>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}
