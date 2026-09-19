import type { Control, FieldValues, Path } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import RhfCountedField from './RhfCountedField';

interface FieldsProps<T extends FieldValues> {
  control: Control<T>;
}

/** Search engines cut a result's title and description off at about these lengths. */
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

/**
 * Name, URL key and (optionally) description — how every filed thing in the
 * store names itself. A blank URL key is made from the name by the server.
 */
export function IdentityFields<T extends FieldValues>({
  control,
  withDescription = true,
}: Readonly<FieldsProps<T> & { withDescription?: boolean }>) {
  const { t } = useTranslation();
  return (
    <>
      <RhfTextField control={control} name={'name' as Path<T>} label={t('shell.common.name')} required />
      <RhfTextField
        control={control}
        name={'slug' as Path<T>}
        label={t('ecommPortal.form.slug')}
        hint={t('ecommPortal.form.slugHint')}
      />
      {withDescription && (
        <RhfTextField
          control={control}
          name={'description' as Path<T>}
          label={t('shell.common.description')}
          multiline
          minRows={2}
        />
      )}
    </>
  );
}

/** The title and description a search result shows, each counted against its limit. */
export function SeoFields<T extends FieldValues>({ control, required }: Readonly<FieldsProps<T> & { required?: boolean }>) {
  const { t } = useTranslation();
  return (
    <>
      <RhfCountedField
        control={control}
        name={'seo_title' as Path<T>}
        label={t('ecommPortal.form.seoTitle')}
        max={SEO_TITLE_MAX}
        required={required}
      />
      <RhfCountedField
        control={control}
        name={'seo_description' as Path<T>}
        label={t('ecommPortal.form.seoDescription')}
        max={SEO_DESCRIPTION_MAX}
        multiline
        required={required}
      />
    </>
  );
}
