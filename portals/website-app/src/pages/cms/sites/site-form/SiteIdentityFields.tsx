import { Controller, type Control } from 'react-hook-form';
import { FormControlLabel, MenuItem, Stack, Switch } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { NAV_SITES } from '../../../website/navigation/queries';
import type { SiteFormValues } from './site.types';

/** Name, key, domains, the legacy site it maps onto, and whether it serves. */
export default function SiteIdentityFields({ control }: Readonly<{ control: Control<SiteFormValues> }>) {
  const { t } = useTranslation();
  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField control={control} name="name" label={t('websiteApp.cms.site.name')} required />
        <RhfTextField control={control} name="key" label={t('websiteApp.cms.site.key')} hint={t('websiteApp.cms.site.keyHint')} required />
      </Stack>
      <RhfTextField control={control} name="domains" label={t('websiteApp.cms.site.domains')} hint={t('websiteApp.cms.site.domainsHint')} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' } }}>
        <RhfTextField
          control={control}
          name="legacy_site"
          select
          label={t('websiteApp.cms.site.legacySite')}
          hint={t('websiteApp.cms.site.legacySiteHint')}
        >
          <MenuItem value="">{t('websiteApp.cms.site.legacyNone')}</MenuItem>
          {NAV_SITES.map((site) => (
            <MenuItem key={site.value} value={site.value}>
              {site.label}
            </MenuItem>
          ))}
        </RhfTextField>
        <Controller
          control={control}
          name="is_active"
          render={({ field }) => (
            <FormControlLabel
              sx={{ minWidth: 160, pt: 1 }}
              control={<Switch checked={Boolean(field.value)} onChange={(_e, checked) => field.onChange(checked)} />}
              label={t('websiteApp.cms.site.active')}
            />
          )}
        />
      </Stack>
    </>
  );
}
