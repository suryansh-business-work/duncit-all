import type { Control } from 'react-hook-form';
import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { z } from 'zod';
import { SeoFields } from '../../../../components/form/IdentityFields';
import RhfImageField from '../../../../components/form/RhfImageField';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';
import type { SettingsTabSpec, StoreSettings } from '../settings.types';

const makeSchema = (t: Translate) => {
  const r = makeRules(t);
  return z.object({ ...r.seo(), og_image_url: r.link() });
};

type SeoValues = z.infer<ReturnType<typeof makeSchema>>;

const toValues = (s: StoreSettings): SeoValues => ({
  seo_title: s.seo_title,
  seo_description: s.seo_description,
  og_image_url: s.og_image_url,
});

function SeoTabFields({ control }: Readonly<{ control: Control<SeoValues> }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <SeoFields control={control} />
      <RhfImageField
        control={control}
        name="og_image_url"
        label={t('ecommPortal.settings.ogImage')}
        hint={t('ecommPortal.settings.ogImageHint')}
      />
    </Stack>
  );
}

/** How the store's home page reads in a search result and a shared link. */
export const SEO_TAB: SettingsTabSpec<SeoValues> = { makeSchema, toValues, toInput: (values) => values, Fields: SeoTabFields };
