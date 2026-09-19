import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { usePortalT } from '../../../../shared/i18n';
import { FormDialog } from '../../../components/FormDialog';
import { RhfSwitch } from '../../../components/RhfSwitch';
import type { LiteAdminCategory } from '../../../graphql/catalogue';
import { categoryValuesFrom, emptyCategoryValues, makeCategorySchema, type CategoryFormValues } from './category.types';

interface Props {
  open: boolean;
  initial: LiteAdminCategory | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
}

export function CategoryForm({ open, initial, busy, onClose, onSubmit }: Readonly<Props>) {
  const { t } = usePortalT();
  const schema = useMemo(() => makeCategorySchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<CategoryFormValues, unknown, CategoryFormValues>({
    defaultValues: emptyCategoryValues(),
    resolver: zodResolver(schema) as Resolver<CategoryFormValues, unknown, CategoryFormValues>,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) reset(initial ? categoryValuesFrom(initial) : emptyCategoryValues());
  }, [open, initial, reset]);

  const title = initial ? t('litePortal.categories.editTitle', { vars: { name: initial.name } }) : t('litePortal.categories.newTitle');

  return (
    <FormDialog open={open} title={title} onSubmit={handleSubmit(onSubmit)} onClose={onClose} busy={busy} testId="category-dialog">
      <Stack spacing={1.5}>
        <RhfTextField control={control} name="name" label={t('litePortal.common.name')} required disabled={busy} slotProps={{ htmlInput: { 'data-testid': 'category-name' } }} />
        <RhfTextField control={control} name="slug" label={t('litePortal.common.slug')} hint={t('litePortal.common.slugHint')} disabled={busy} slotProps={{ htmlInput: { 'data-testid': 'category-slug' } }} />
        <RhfTextField control={control} name="icon" label={t('litePortal.categories.icon')} hint={t('litePortal.categories.iconHint')} disabled={busy} slotProps={{ htmlInput: { 'data-testid': 'category-icon' } }} />
        <RhfTextField
          control={control}
          name="sort_order"
          label={t('litePortal.common.sortOrder')}
          hint={t('litePortal.common.sortOrderHint')}
          disabled={busy}
          slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'category-sort-order' } }}
        />
        <RhfSwitch control={control} name="is_active" label={t('litePortal.common.active')} hint={t('litePortal.common.activeHint')} disabled={busy} testId="category-active" />
      </Stack>
    </FormDialog>
  );
}
