import type { Control } from 'react-hook-form';
import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { z } from 'zod';
import RhfRichText from '../../../../components/form/RhfRichText';
import type { SettingsTabSpec, StoreSettings } from '../settings.types';

const makeSchema = () =>
  z.object({
    shipping_policy_html: z.string(),
    returns_policy_html: z.string(),
    terms_html: z.string(),
    about_html: z.string(),
  });

type PagesValues = z.infer<ReturnType<typeof makeSchema>>;

const toValues = (s: StoreSettings): PagesValues => ({
  shipping_policy_html: s.shipping_policy_html,
  returns_policy_html: s.returns_policy_html,
  terms_html: s.terms_html,
  about_html: s.about_html,
});

function PagesFields({ control }: Readonly<{ control: Control<PagesValues> }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={3}>
      <RhfRichText
        control={control}
        name="shipping_policy_html"
        label={t('ecommPortal.settings.shippingPolicy')}
        aiContext="pet store shipping policy"
      />
      <RhfRichText
        control={control}
        name="returns_policy_html"
        label={t('ecommPortal.settings.returnsPolicy')}
        aiContext="pet store returns policy"
      />
      <RhfRichText control={control} name="terms_html" label={t('ecommPortal.settings.terms')} aiContext="pet store terms of sale" />
      <RhfRichText control={control} name="about_html" label={t('ecommPortal.settings.about')} aiContext="pet store about page" />
    </Stack>
  );
}

/** The store's own pages: shipping and returns policies, terms, about. */
export const PAGES_TAB: SettingsTabSpec<PagesValues> = { makeSchema, toValues, toInput: (values) => values, Fields: PagesFields };
