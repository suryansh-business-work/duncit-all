import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { brandCompletionPercent, brandStepStates } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { makeBrandSchema, toFormValues, type BrandFormValues } from '../schema';
import type { EcommBrand } from '../queries';
import { toFacts } from './wizard-steps';

/**
 * The wizard's form plus the live judgement of every step: the form values as
 * the partner types them, and the integration/consent facts the server holds.
 * The form resets when a different brand loads, never on a save — a save
 * returns what was just typed.
 */
export function useBrandWizard(brand: EcommBrand | null, accountEmail: string) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeBrandSchema(t), [t]);
  const form = useForm<BrandFormValues, any, BrandFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<BrandFormValues, any, BrandFormValues>,
    defaultValues: toFormValues(brand, accountEmail),
    mode: 'onBlur',
  });
  const { reset, watch } = form;
  const brandId = brand?.id;

  useEffect(() => {
    if (brandId) reset(toFormValues(brand, accountEmail));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]);

  const values = watch();
  const facts = toFacts(values, { integrations: brand?.integrations, consent: brand?.consent });
  const states = brandStepStates(facts);
  const percent = brandCompletionPercent(facts);

  return { form, facts, states, percent };
}

export type BrandWizardForm = ReturnType<typeof useBrandWizard>['form'];
