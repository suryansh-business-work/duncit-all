import { Controller, type Control } from 'react-hook-form';
import { MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { SingleImageUploadField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';
import type { CmsFragmentKind } from '@duncit/gql-types';
import type { SiteFormValues } from './site.types';
import SeoSharingFields from '../../components/SeoSharingFields';

export interface FragmentOption {
  id: string;
  name: string;
  kind: CmsFragmentKind;
}

interface Props {
  control: Control<SiteFormValues>;
  fragments: FragmentOption[];
}

const IMAGE_FOLDER = '/website/cms';

/** Favicon, the SEO defaults every page inherits, and the site chrome. */
export default function SiteSeoFields({ control, fragments }: Readonly<Props>) {
  const { t } = useTranslation();
  const headers = fragments.filter((f) => f.kind === 'HEADER');
  const footers = fragments.filter((f) => f.kind === 'FOOTER');

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Controller
          control={control}
          name="favicon_url"
          render={({ field, fieldState }) => (
            <SingleImageUploadField
              value={field.value ?? ''}
              onChange={field.onChange}
              folder={IMAGE_FOLDER}
              label={t('websiteApp.cms.site.favicon')}
              error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="seo_image"
          render={({ field, fieldState }) => (
            <SingleImageUploadField
              value={field.value ?? ''}
              onChange={field.onChange}
              folder={IMAGE_FOLDER}
              label={t('websiteApp.cms.site.seoImage')}
              error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
            />
          )}
        />
      </Stack>
      <RhfTextField control={control} name="seo_title" label={t('websiteApp.cms.site.seoTitle')} slotProps={{ htmlInput: { maxLength: 160 } }} />
      <RhfTextField
        control={control}
        name="seo_description"
        label={t('websiteApp.cms.site.seoDescription')}
        multiline
        minRows={2}
        slotProps={{ htmlInput: { maxLength: 320 } }}
      />
      <SeoSharingFields control={control} />
      {fragments.length > 0 && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RhfTextField control={control} name="header_fragment_id" select label={t('websiteApp.cms.site.header')}>
            <MenuItem value="">{t('websiteApp.cms.site.none')}</MenuItem>
            {headers.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name}
              </MenuItem>
            ))}
          </RhfTextField>
          <RhfTextField control={control} name="footer_fragment_id" select label={t('websiteApp.cms.site.footer')}>
            <MenuItem value="">{t('websiteApp.cms.site.none')}</MenuItem>
            {footers.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name}
              </MenuItem>
            ))}
          </RhfTextField>
        </Stack>
      )}
    </>
  );
}
