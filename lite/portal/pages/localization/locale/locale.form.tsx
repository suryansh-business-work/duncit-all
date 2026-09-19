import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { usePortalT } from '../../../../shared/i18n';
import { FormDialog } from '../../../components/FormDialog';
import { RhfSwitch } from '../../../components/RhfSwitch';
import type { LiteLocale } from '../../../graphql/localization';
import { emptyLocaleValues, localeValuesFrom, makeLocaleSchema, type LocaleFormValues } from './locale.types';

interface Props {
  open: boolean;
  initial: LiteLocale | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: LocaleFormValues) => Promise<void>;
}

export function LocaleForm({ open, initial, busy, onClose, onSubmit }: Readonly<Props>) {
  const { t } = usePortalT();
  const schema = useMemo(() => makeLocaleSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<LocaleFormValues, unknown, LocaleFormValues>({
    defaultValues: emptyLocaleValues(),
    resolver: zodResolver(schema) as Resolver<LocaleFormValues, unknown, LocaleFormValues>,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) reset(initial ? localeValuesFrom(initial) : emptyLocaleValues());
  }, [open, initial, reset]);

  const title = initial ? t('litePortal.localization.editLocaleTitle', { vars: { label: initial.english_label } }) : t('litePortal.localization.newLocaleTitle');

  return (
    <FormDialog open={open} title={title} onSubmit={handleSubmit(onSubmit)} onClose={onClose} busy={busy} testId="locale-dialog">
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="code"
          label={t('litePortal.localization.code')}
          hint={t('litePortal.localization.codeHint')}
          required
          disabled={busy || Boolean(initial)}
          slotProps={{ htmlInput: { 'data-testid': 'locale-code' } }}
        />
        <RhfTextField control={control} name="label" label={t('litePortal.localization.label')} hint={t('litePortal.localization.labelHint')} required disabled={busy} slotProps={{ htmlInput: { 'data-testid': 'locale-label' } }} />
        <RhfTextField
          control={control}
          name="english_label"
          label={t('litePortal.localization.englishLabel')}
          hint={t('litePortal.localization.englishLabelHint')}
          required
          disabled={busy}
          slotProps={{ htmlInput: { 'data-testid': 'locale-english-label' } }}
        />
        <RhfTextField
          control={control}
          name="sort_order"
          label={t('litePortal.common.sortOrder')}
          hint={t('litePortal.common.sortOrderHint')}
          disabled={busy}
          slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'locale-sort-order' } }}
        />
        <RhfSwitch control={control} name="is_rtl" label={t('litePortal.localization.isRtl')} disabled={busy} testId="locale-rtl" />
        <RhfSwitch control={control} name="is_default" label={t('litePortal.localization.isDefault')} hint={t('litePortal.localization.isDefaultHint')} disabled={busy} testId="locale-default" />
        <RhfSwitch control={control} name="is_active" label={t('litePortal.common.active')} disabled={busy} testId="locale-active" />
      </Stack>
    </FormDialog>
  );
}
