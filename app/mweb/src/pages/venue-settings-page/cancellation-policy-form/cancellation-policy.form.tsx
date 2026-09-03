import { useEffect, useMemo } from 'react';
import {
  Controller,
  useFieldArray,
  useForm,
  type Control,
  type FieldArrayWithId,
  type Resolver,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Divider, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import CancellationTierRow from './CancellationTierRow';
import {
  emptyTier,
  makeCancellationPolicySchema,
  type CancellationPolicyValues,
} from './cancellation-policy.types';
import { useTranslation } from '../../../i18n/useTranslation';

type TierField = FieldArrayWithId<CancellationPolicyValues, 'tiers', 'id'>;

interface BandsProps {
  control: Control<CancellationPolicyValues>;
  fields: readonly TierField[];
  disabled: boolean;
  onRemove: (index: number) => void;
}

/** The bands, or the sentence that says cancelling is free without any. */
function PolicyBands({ control, fields, disabled, onRemove }: Readonly<BandsProps>) {
  const { t } = useTranslation();
  if (fields.length === 0) {
    return <Alert severity="success">{t('venueSettings.noBands')}</Alert>;
  }
  return (
    <Stack spacing={1}>
      {fields.map((row, index) => (
        <CancellationTierRow
          key={row.id}
          control={control}
          index={index}
          disabled={disabled}
          onRemove={() => onRemove(index)}
        />
      ))}
    </Stack>
  );
}

interface Props {
  initialValues: CancellationPolicyValues;
  saving: boolean;
  error: string | null;
  onSubmit: (values: CancellationPolicyValues) => Promise<void>;
}

/**
 * The venue's cancellation policy: any number of bands, plus the switch that
 * takes cancelling off the table altogether. Turning that switch on greys the
 * bands out rather than deleting them — they come back if it goes off again.
 * Native twin: the Tamagui cancellation policy form (rule 27).
 */
export default function CancellationPolicyForm({ initialValues, saving, error, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  // The schema carries the reader's messages, so it is built from their `t`.
  const resolver = useMemo(
    () =>
      zodResolver(makeCancellationPolicySchema(t)) as unknown as Resolver<
        CancellationPolicyValues,
        any,
        CancellationPolicyValues
      >,
    [t]
  );
  const form = useForm<CancellationPolicyValues, any, CancellationPolicyValues>({
    defaultValues: initialValues,
    resolver,
    mode: 'onTouched',
  });
  const tiers = useFieldArray({ control: form.control, name: 'tiers' });
  const rescheduleOnly = form.watch('reschedule_only');

  // A refetched policy replaces what the form holds; the page keys
  // `initialValues` off the policy's CONTENT, so a background refresh never
  // wipes what the owner was typing.
  useEffect(() => {
    form.reset(initialValues);
  }, [initialValues, form]);

  const submit = form.handleSubmit((values) => onSubmit(values));

  return (
    <Stack component="form" noValidate onSubmit={submit} spacing={1.5}>
      <Controller
        control={form.control}
        name="reschedule_only"
        render={({ field }) => (
          <FormControlLabel
            control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
            label={t('venueSettings.rescheduleOnly')}
          />
        )}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('venueSettings.rescheduleOnlyHint')}
      </Typography>

      <Divider />

      {rescheduleOnly && <Alert severity="info">{t('venueSettings.policyDisabled')}</Alert>}

      <Stack spacing={0.25}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('venueSettings.bandsTitle')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('venueSettings.bandsHint')}
        </Typography>
      </Stack>

      <PolicyBands
        control={form.control}
        fields={tiers.fields}
        disabled={rescheduleOnly}
        onRemove={tiers.remove}
      />

      <Stack direction="row" spacing={1}>
        <DuncitButton
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => tiers.append(emptyTier)}
          disabled={rescheduleOnly}
          sx={{ flex: 1, borderRadius: 999, fontWeight: 700 }}
        >
          {t('venueSettings.addBand')}
        </DuncitButton>
        <DuncitButton
          type="submit"
          variant="contained"
          size="small"
          disabled={saving}
          sx={{ flex: 1, borderRadius: 999, fontWeight: 700 }}
        >
          {saving ? t('venueSettings.saving') : t('venueSettings.save')}
        </DuncitButton>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
