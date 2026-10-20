import { useEffect, useMemo, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from '@duncit/app-settings';
import { FormActionsRow } from '@duncit/ui';
import FeesSection from './FeesSection';
import HoursSection from './HoursSection';
import ModelSection from './ModelSection';
import RulesSection from './RulesSection';
import SlotsSection from './SlotsSection';
import { buildVenuePricingSchema } from './venue-pricing.schema';
import type { VenuePricingFormValues } from './venue-pricing.types';

export { buildVenuePricingSchema };

interface Props {
  /** The saved pricing as form values; a new value (after a save) resets the form to it. */
  defaultValues: VenuePricingFormValues;
  onSubmit: (values: VenuePricingFormValues) => Promise<void>;
  saving: boolean;
  /** The server's answer to the last save (BAD_USER_INPUT names the field). */
  errorMessage: string | null;
  /** The live preview, drawn beside the form with the CURRENT (unsaved) values. */
  renderPreview: (values: VenuePricingFormValues, valid: boolean) => ReactNode;
}

/**
 * The Venue Pricing Module form (RHF + Zod): pricing model and rate, the
 * limits that model reads, slots or opening hours, fees and price rules. The
 * price itself is never computed here — the preview asks the server.
 */
export default function VenuePricingForm({ defaultValues, onSubmit, saving, errorMessage, renderPreview }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildVenuePricingSchema(t), [t]);
  const { control, handleSubmit, reset, watch, formState } = useForm<VenuePricingFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => reset(defaultValues), [defaultValues, reset]);

  const values = watch();
  const valid = schema.safeParse(values).success;
  const isSlots = values.model === 'PER_SLOT';

  return (
    <form
      noValidate
      aria-label={t('venuePricing.form.title')}
      data-testid="venue-pricing-form"
      onSubmit={handleSubmit(async (next) => {
        await onSubmit(next);
      })}
    >
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={2.5}>
            <ModelSection control={control} />
            {isSlots ? <SlotsSection control={control} /> : <HoursSection control={control} />}
            <FeesSection control={control} />
            <RulesSection control={control} />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>{renderPreview(values, valid)}</Stack>
        </Grid>
        <FormActionsRow
          submitLabel={t('venuePricing.form.save')}
          busy={saving}
          disabled={!formState.isDirty}
          errorMessage={errorMessage}
          startIcon={<SaveIcon />}
        />
      </Grid>
    </form>
  );
}
