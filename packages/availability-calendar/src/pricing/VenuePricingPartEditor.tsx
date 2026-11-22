import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { createLogger } from '@duncit/logs';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { FeesSection, RulesSection, buildVenuePricingSchema, savedPricingInput, toFormValues, toPricingInput, type VenuePricingFormValues } from './form';
import type { VenuePricingData } from './types';
import { usePricingModule } from './usePricingModule';

const logger = createLogger('portal');

/** The one part of a venue's pricing a page edits. */
export type PricingPart = 'fees' | 'rules';

const PART_FIELDS: Readonly<Record<PricingPart, FieldPath<VenuePricingFormValues>[]>> = {
  fees: ['deposit', 'cleaning_fee', 'pet_fee', 'gst_enabled'],
  rules: ['price_rules'],
};

/**
 * The saved pricing with ONLY this part replaced: the server stores pricing
 * whole, so a fees save sends the saved rules back unchanged and the other way
 * round — nothing a page does not show can change.
 */
export function pricingWithPart(part: PricingPart, pricing: VenuePricingData, values: VenuePricingFormValues) {
  const saved = savedPricingInput(pricing);
  const next = toPricingInput(values);
  if (part === 'rules') return { ...saved, price_rules: next.price_rules };
  return { ...saved, deposit: next.deposit, cleaning_fee: next.cleaning_fee, pet_fee: next.pet_fee, gst_enabled: next.gst_enabled };
}

interface Props {
  venueId: string;
  part: PricingPart;
}

/**
 * The fees on Fees & Minimum Spend, or Price Rules — one part of the venue's
 * pricing on a page of its own. The Partners console and mWeb mount this one
 * component (the native app has its Tamagui twin).
 */
export default function VenuePricingPartEditor({ venueId, part }: Readonly<Props>) {
  const { t } = useTranslation();
  const pricingModule = usePricingModule(venueId);
  const { pricing } = pricingModule;
  const schema = useMemo(() => buildVenuePricingSchema(t), [t]);
  const defaults = useMemo(() => toFormValues(pricing), [pricing]);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<VenuePricingFormValues>({ resolver: zodResolver(schema), defaultValues: defaults, mode: 'onChange' });
  const { reset } = form;

  useEffect(() => reset(defaults), [defaults, reset]);

  if (pricingModule.loading) return <Loader size={24} sx={{ py: 4 }} />;
  if (!pricing) return <Alert severity="error">{t('venuePricing.part.loadFailed')}</Alert>;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    // Only this part's fields are checked: the rest is the saved pricing, sent back as it is.
    const ok = await form.trigger(PART_FIELDS[part], { shouldFocus: true });
    if (!ok) return;
    try {
      await pricingModule.save(pricingWithPart(part, pricing, form.getValues()));
      notifySuccess(t('venuePricing.part.saved'));
    } catch (saveError) {
      // A GraphQL refusal with an empty message parses to '': this editor's own words go there too.
      const fallback = t('venuePricing.part.saveFailed');
      setError(parseApiError(saveError, fallback) || fallback);
      logger.warn('VenuePricingPartEditor', 'save', { error: saveError, venue_id: venueId, part });
    }
  };

  return (
    <form noValidate data-testid={`venue-pricing-${part}`} onSubmit={submit}>
      <Stack spacing={2.5}>
        {part === 'fees' ? <FeesSection control={form.control} /> : <RulesSection control={form.control} />}
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            loading={pricingModule.saving}
            disabled={!form.formState.isDirty}
            data-testid={`venue-pricing-${part}-save`}
          >
            {t('venuePricing.part.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
