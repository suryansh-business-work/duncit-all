import { useMemo, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MenuItem, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { CASE_TYPES, MANUAL_LIMITS, TYPE_KEYS } from '../../shared/vocabulary';
import { BLANK_QUICK_CREATE, quickCreateSchema, type QuickCreateValues } from './quick-create.types';

interface Props {
  /** Resolves true once the case is filed, so the form clears for the next one. */
  onSubmit: (values: QuickCreateValues) => Promise<boolean>;
  onCancel: () => void;
  saving: boolean;
}

/** Type a title, pick a type, press Enter — the card lands at the bottom of the column. */
export default function QuickCreateForm({ onSubmit, onCancel, saving }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => quickCreateSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<QuickCreateValues>({
    resolver: zodResolver(schema),
    defaultValues: BLANK_QUICK_CREATE,
  });

  const submit = handleSubmit(async (values) => {
    if (await onSubmit(values)) reset({ ...BLANK_QUICK_CREATE, type: values.type });
  });

  // On the title field, not the form: Escape that closes the Type menu must not drop the whole draft.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') onCancel();
  };

  return (
    <Stack component="form" spacing={1} onSubmit={submit} noValidate sx={{ p: 1 }}>
      <RhfTextField
        control={control}
        name="title"
        size="small"
        label={t('testsManual.quickCreate.title')}
        placeholder={t('testsManual.quickCreate.placeholder')}
        onKeyDown={onKeyDown}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- focus moves into the form the user just opened (WCAG 2.4.3)
        autoFocus
        required
        slotProps={{ htmlInput: { maxLength: MANUAL_LIMITS.titleMax } }}
      />
      <RhfTextField control={control} name="type" size="small" select label={t('testsManual.field.type')}>
        {CASE_TYPES.map((type) => (
          <MenuItem key={type} value={type}>
            {t(TYPE_KEYS[type])}
          </MenuItem>
        ))}
      </RhfTextField>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton size="small" onClick={onCancel} disabled={saving}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton size="small" type="submit" variant="contained" loading={saving}>
          {t('testsManual.quickCreate.submit')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
