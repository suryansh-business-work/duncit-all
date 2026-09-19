import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { usePortalT } from '../../../../shared/i18n';
import { FormDialog } from '../../../components/FormDialog';
import type { LiteTranslationRow } from '../../../graphql/localization';
import { emptyTranslationValues, makeTranslationSchema, type TranslationFormValues } from './translation.types';

interface Props {
  open: boolean;
  /** The row being edited; null adds a new key. */
  initial: LiteTranslationRow | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: TranslationFormValues) => Promise<void>;
}

export function TranslationForm({ open, initial, busy, onClose, onSubmit }: Readonly<Props>) {
  const { t } = usePortalT();
  const schema = useMemo(() => makeTranslationSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<TranslationFormValues, unknown, TranslationFormValues>({
    defaultValues: emptyTranslationValues(),
    resolver: zodResolver(schema) as Resolver<TranslationFormValues, unknown, TranslationFormValues>,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) reset(initial ? { key: initial.key, value: initial.value } : emptyTranslationValues());
  }, [open, initial, reset]);

  const title = initial ? t('litePortal.localization.editTranslationTitle') : t('litePortal.localization.newTranslationTitle');

  return (
    <FormDialog open={open} title={title} onSubmit={handleSubmit(onSubmit)} onClose={onClose} busy={busy} testId="translation-dialog">
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="key"
          label={t('litePortal.localization.key')}
          hint={t('litePortal.localization.keyHint')}
          required
          disabled={busy || Boolean(initial)}
          slotProps={{ htmlInput: { 'data-testid': 'translation-key', style: { fontFamily: 'monospace' } } }}
        />
        <RhfTextField
          control={control}
          name="value"
          label={t('litePortal.localization.value')}
          hint={t('litePortal.localization.valueHint')}
          required
          multiline
          minRows={3}
          disabled={busy}
          slotProps={{ htmlInput: { 'data-testid': 'translation-value' } }}
        />
      </Stack>
    </FormDialog>
  );
}
