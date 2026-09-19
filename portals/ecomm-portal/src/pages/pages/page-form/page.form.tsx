import { Divider, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import FormDialog from '../../../components/FormDialog';
import type { ListFormProps } from '../../../components/ListEditorPage';
import { SeoFields } from '../../../components/form/IdentityFields';
import RhfRichText from '../../../components/form/RhfRichText';
import RhfSwitch from '../../../components/form/RhfSwitch';
import { useSchemaForm } from '../../../components/form/useSchemaForm';
import type { StorePage } from '../../../queries/pages';
import { makePageSchema, toPageValues, type PageValues } from './page.types';

/** Create or edit one of the store's own pages — a policy, a guide, an about page. */
export default function PageForm({ initial, busy, onClose, onSubmit }: Readonly<ListFormProps<StorePage>>) {
  const { t, form } = useSchemaForm<PageValues>(makePageSchema, toPageValues(initial));
  const { control, handleSubmit } = form;
  return (
    <FormDialog
      formId="page-form"
      title={initial ? t('ecommPortal.pages.editTitle') : t('ecommPortal.pages.newTitle')}
      busy={busy}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      maxWidth="md"
    >
      <Stack spacing={1} data-testid="page-form">
        <RhfTextField control={control} name="title" label={t('ecommPortal.pages.title')} required data-testid="page-title" />
        <RhfTextField
          control={control}
          name="slug"
          label={t('ecommPortal.form.slug')}
          hint={t('ecommPortal.form.slugHint')}
          data-testid="page-slug"
        />
        <RhfRichText control={control} name="content_html" label={t('ecommPortal.pages.content')} aiContext="pet store policy page" />
        <RhfSwitch control={control} name="show_in_footer" label={t('ecommPortal.pages.showInFooter')} testId="page-show-in-footer" />
        <RhfSwitch control={control} name="is_active" label={t('shell.common.active')} hint={t('ecommPortal.form.activeHint')} testId="page-active" />
        <Divider />
        <SeoFields control={control} />
      </Stack>
    </FormDialog>
  );
}
