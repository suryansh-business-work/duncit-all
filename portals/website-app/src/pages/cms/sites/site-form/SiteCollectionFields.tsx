import { Controller, useFieldArray, useWatch, type Control } from 'react-hook-form';
import { FormControlLabel, FormLabel, Stack, Switch } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { useCmsLabels } from '../../lib/labels';
import type { SiteFormValues } from './site.types';

/** Which sections (Blog, Careers, …) the site has, and the path each lives at. */
export default function SiteCollectionFields({ control }: Readonly<{ control: Control<SiteFormValues> }>) {
  const { t } = useTranslation();
  const labels = useCmsLabels();
  const { fields } = useFieldArray({ control, name: 'collections' });
  const rows = useWatch({ control, name: 'collections' });

  return (
    <Stack spacing={1} role="group" aria-labelledby="cms-site-collections">
      <FormLabel id="cms-site-collections">{t('websiteApp.cms.site.collections')}</FormLabel>
      {fields.map((field, index) => {
        const name = labels.collection[field.collection];
        return (
          <Stack key={field.id} direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <Controller
              control={control}
              name={`collections.${index}.enabled`}
              render={({ field: toggle }) => (
                <FormControlLabel
                  sx={{ minWidth: 200 }}
                  control={<Switch checked={Boolean(toggle.value)} onChange={(_e, checked) => toggle.onChange(checked)} />}
                  label={name}
                />
              )}
            />
            <RhfTextField
              control={control}
              name={`collections.${index}.path`}
              size="small"
              disabled={!rows?.[index]?.enabled}
              label={t('websiteApp.cms.site.collectionPath', { vars: { name } })}
            />
          </Stack>
        );
      })}
    </Stack>
  );
}
