import { useMemo } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, DialogActions, MenuItem, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { CmsCollection } from '@duncit/gql-types';
import type { CmsPageRow } from '../../queries/pages';
import { useCmsLabels } from '../../lib/labels';
import RhfSwitch from '../../components/RhfSwitch';
import PageAdvancedFields from './PageAdvancedFields';
import { pageSchema, toPageFormValues, type PageFormOutput, type PageFormValues, type PagePreset } from './page.types';

interface Props {
  page: CmsPageRow | null;
  /** For a new page: a starting address and title (the error-page shortcuts). */
  preset?: PagePreset | null;
  /** The collections this site has — the only ones a template can be for. */
  collections: CmsCollection[];
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: PageFormOutput) => void;
  onCancel: () => void;
}

/** A page's address, kind, chrome, SEO and page-level code — not its design. */
export default function PageForm({ page, preset = null, collections, submitting, errorMessage, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useCmsLabels();
  const schema = useMemo(() => pageSchema((key) => t(key)), [t]);
  const { control, handleSubmit } = useForm<PageFormValues, unknown, PageFormOutput>({
    defaultValues: toPageFormValues(page, preset),
    resolver: zodResolver(schema) as Resolver<PageFormValues, unknown, PageFormOutput>,
    mode: 'onTouched',
  });
  const kind = useWatch({ control, name: 'kind' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="cms-page-form">
      <Stack spacing={2} sx={{ mt: 1 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <RhfTextField control={control} name="title" label={t('websiteApp.cms.pageForm.title')} required />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RhfTextField control={control} name="kind" select label={t('websiteApp.cms.pageForm.kind')} disabled={Boolean(page)}>
            <MenuItem value="PAGE">{labels.pageKind.PAGE}</MenuItem>
            <MenuItem value="COLLECTION_LIST" disabled={collections.length === 0}>
              {labels.pageKind.COLLECTION_LIST}
            </MenuItem>
            <MenuItem value="COLLECTION_DETAIL" disabled={collections.length === 0}>
              {labels.pageKind.COLLECTION_DETAIL}
            </MenuItem>
          </RhfTextField>
          {kind === 'PAGE' ? (
            <RhfTextField
              control={control}
              name="path"
              label={t('websiteApp.cms.pageForm.path')}
              hint={t('websiteApp.cms.pageForm.pathHint')}
              required
            />
          ) : (
            <RhfTextField control={control} name="collection_type" select label={t('websiteApp.cms.pageForm.collection')} disabled={Boolean(page)}>
              {collections.map((collection) => (
                <MenuItem key={collection} value={collection}>
                  {labels.collection[collection]}
                </MenuItem>
              ))}
            </RhfTextField>
          )}
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
          <RhfSwitch control={control} name="show_header" label={t('websiteApp.cms.pageForm.showHeader')} />
          <RhfSwitch control={control} name="show_footer" label={t('websiteApp.cms.pageForm.showFooter')} />
          <RhfTextField control={control} name="sort_order" type="number" size="small" label={t('websiteApp.cms.pageForm.sortOrder')} sx={{ maxWidth: 140 }} />
        </Stack>
        <PageAdvancedFields control={control} />
      </Stack>
      <DialogActions sx={{ px: 0, pt: 2 }}>
        <DuncitButton onClick={onCancel} disabled={submitting}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={submitting} data-testid="cms-page-save">
          {t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
