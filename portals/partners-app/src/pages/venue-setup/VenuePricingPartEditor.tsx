import { useEffect, useMemo, useState } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, CircularProgress, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import {
  FeesSection,
  RulesSection,
  buildVenuePricingSchema,
  savedPricingInput,
  toFormValues,
  toPricingInput,
  usePricingModule,
  type VenuePricingData,
  type VenuePricingFormValues,
} from '@duncit/availability-calendar';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';

/** The one part of a venue's pricing a page edits. */
export type PricingPart = 'fees' | 'rules';

const PART_FIELDS: Readonly<Record<PricingPart, FieldPath<VenuePricingFormValues>[]>> = {
  fees: ['min_spend', 'deposit', 'cleaning_fee', 'pet_fee', 'gst_enabled'],
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
  return {
    ...saved,
    min_spend: next.min_spend,
    deposit: next.deposit,
    cleaning_fee: next.cleaning_fee,
    pet_fee: next.pet_fee,
    gst_enabled: next.gst_enabled,
  };
}

interface Props {
  venueId: string;
  part: PricingPart;
}

/** Fees & Minimum Spend, or Price Rules — one part of the venue's pricing on a page of its own. */
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

  if (pricingModule.loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }
  if (!pricing) return <Alert severity="error">{t('partners.venueSetup.loadFailed')}</Alert>;

  const submit = async () => {
    setError(null);
    // Only this part's fields are checked: the rest is the saved pricing, sent back as it is.
    const ok = await form.trigger(PART_FIELDS[part], { shouldFocus: true });
    if (!ok) return;
    try {
      await pricingModule.save(pricingWithPart(part, pricing, form.getValues()));
      notifySuccess(t('partners.venueSetup.saved'));
    } catch (saveError) {
      setError(parseApiError(saveError) || t('partners.venueSetup.saveFailed'));
      logs.portal['partners-app'].warn('venue-pricing-part', 'save', { error: saveError, venue_id: venueId, part });
    }
  };

  return (
    <form
      noValidate
      data-testid={`venue-pricing-${part}`}
      onSubmit={(event) => {
        event.preventDefault();
        submit().catch(() => undefined);
      }}
    >
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
            {t('partners.venueSetup.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
