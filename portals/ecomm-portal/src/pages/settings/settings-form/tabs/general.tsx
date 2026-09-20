import type { Control } from 'react-hook-form';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { z } from 'zod';
import RhfFieldList from '../../../../components/form/FieldList';
import RhfImageField from '../../../../components/form/RhfImageField';
import RhfSwitch from '../../../../components/form/RhfSwitch';
import { TWO_COLUMNS } from '../../../../lib/layout';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';
import type { SettingsTabSpec, StoreSettings } from '../settings.types';

const makeSchema = (t: Translate) => {
  const r = makeRules(t);
  return z.object({
    store_enabled: z.boolean(),
    store_name: r.requiredText(60),
    tagline: r.optionalText(120),
    logo_url: r.link(),
    favicon_url: r.link(),
    support_email: r.email(),
    support_phone: r.optionalText(20),
    whatsapp_number: r.optionalText(20),
    announcement_enabled: z.boolean(),
    announcement_text: r.optionalText(200),
    announcement_link: r.link(),
    social_links: z.array(z.object({ label: r.requiredText(40), url: r.webUrl() })).max(12),
  });
};

type GeneralValues = z.infer<ReturnType<typeof makeSchema>>;

const toValues = (s: StoreSettings): GeneralValues => ({
  store_enabled: s.store_enabled,
  store_name: s.store_name,
  tagline: s.tagline,
  logo_url: s.logo_url,
  favicon_url: s.favicon_url,
  support_email: s.support_email,
  support_phone: s.support_phone,
  whatsapp_number: s.whatsapp_number,
  announcement_enabled: s.announcement_enabled,
  announcement_text: s.announcement_text,
  announcement_link: s.announcement_link,
  social_links: s.social_links.map((link) => ({ label: link.label, url: link.url })),
});

function GeneralFields({ control }: Readonly<{ control: Control<GeneralValues> }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <RhfSwitch control={control} name="store_enabled" label={t('ecommPortal.settings.storeOpen')} hint={t('ecommPortal.settings.storeOpenHint')} />
      <Box sx={TWO_COLUMNS}>
        <RhfTextField control={control} name="store_name" label={t('ecommPortal.settings.storeName')} required />
        <RhfTextField control={control} name="tagline" label={t('ecommPortal.settings.tagline')} />
        <RhfImageField control={control} name="logo_url" label={t('ecommPortal.settings.logo')} />
        <RhfImageField control={control} name="favicon_url" label={t('ecommPortal.settings.favicon')} />
        <RhfTextField control={control} name="support_email" label={t('ecommPortal.settings.supportEmail')} type="email" />
        <RhfTextField control={control} name="support_phone" label={t('ecommPortal.settings.supportPhone')} type="tel" />
        <RhfTextField control={control} name="whatsapp_number" label={t('ecommPortal.settings.whatsapp')} type="tel" />
      </Box>
      <Divider />
      <RhfSwitch control={control} name="announcement_enabled" label={t('ecommPortal.settings.announcement')} hint={t('ecommPortal.settings.announcementHint')} />
      <RhfTextField control={control} name="announcement_text" label={t('ecommPortal.settings.announcementText')} />
      <RhfTextField control={control} name="announcement_link" label={t('ecommPortal.homePage.link')} />
      <Divider />
      <Typography component="h3" variant="subtitle2">
        {t('ecommPortal.settings.socialLinks')}
      </Typography>
      <RhfFieldList
        control={control}
        name="social_links"
        blank={{ label: '', url: '' }}
        max={12}
        columns={[
          { key: 'label', label: t('ecommPortal.settings.socialLabel'), required: true },
          { key: 'url', label: t('ecommPortal.settings.socialUrl'), required: true },
        ]}
        addLabel={t('ecommPortal.settings.addSocial')}
        itemLabel={(position) => t('ecommPortal.settings.socialN', { vars: { n: position } })}
      />
    </Stack>
  );
}

/** Who the store is and how shoppers reach it. */
export const GENERAL_TAB: SettingsTabSpec<GeneralValues> = { makeSchema, toValues, toInput: (values) => values, Fields: GeneralFields };
