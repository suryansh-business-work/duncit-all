import { useMemo, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { MANUAL_LIMITS } from '../../shared/vocabulary';
import { SaveStatus } from '../SaveStatus';
import type { SaveState } from '../useSaveCase';
import { caseTitleSchema, type CaseTitleValues } from './case-title.types';

interface Props {
  initial: string;
  state: SaveState;
  onSubmit: (title: string) => Promise<void>;
  onCancel: () => void;
}

/** Rename a case in place; Escape puts the old title back. */
export default function CaseTitleForm({ initial, state, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => caseTitleSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<CaseTitleValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: initial },
  });
  const saving = state === 'saving';

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') onCancel();
  };

  return (
    <Stack
      component="form"
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(values.title))}
      sx={{ alignItems: { sm: 'flex-start' } }}
    >
      <RhfTextField
        control={control}
        name="title"
        label={t('testsManual.field.title')}
        onKeyDown={onKeyDown}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- focus moves into the rename field the user just opened (WCAG 2.4.3)
        autoFocus
        required
        disabled={saving}
        slotProps={{ htmlInput: { maxLength: MANUAL_LIMITS.titleMax } }}
      />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', pt: { sm: 1 } }}>
        <DuncitButton type="submit" variant="contained" loading={saving} disabled={!formState.isDirty}>
          {t('shell.common.save')}
        </DuncitButton>
        <DuncitButton onClick={onCancel} disabled={saving}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <SaveStatus state={state} dirty={formState.isDirty} />
      </Stack>
    </Stack>
  );
}
