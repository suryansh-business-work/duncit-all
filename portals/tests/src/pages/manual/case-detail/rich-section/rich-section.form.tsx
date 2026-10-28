import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormHelperText, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { useTranslation } from '@duncit/shell';
import { SaveStatus } from '../SaveStatus';
import type { SaveState } from '../useSaveCase';
import { CASE_IMAGE_FOLDER, richSectionSchema, type RichSectionValues } from './rich-section.types';

interface Props {
  initial: string;
  /** The section's name — the editor's accessible name and the AI's context. */
  label: string;
  state: SaveState;
  onSubmit: (html: string) => Promise<void>;
  onCancel: () => void;
}

/** Edit one rich-text section of a case; Save writes only this section. */
export default function RichSectionForm({ initial, label, state, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => richSectionSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<RichSectionValues>({
    resolver: zodResolver(schema),
    defaultValues: { html: initial },
  });
  const saving = state === 'saving';

  return (
    <Stack component="form" spacing={1} noValidate onSubmit={handleSubmit((values) => onSubmit(values.html))}>
      <Controller
        control={control}
        name="html"
        render={({ field, fieldState }) => (
          <>
            <DuncitRichTextInput
              value={field.value}
              onChange={(html) => field.onChange(html)}
              ariaLabel={label}
              aiContext={label}
              imageFolder={CASE_IMAGE_FOLDER}
              disabled={saving}
            />
            {fieldState.error ? <FormHelperText error>{fieldState.error.message}</FormHelperText> : null}
          </>
        )}
      />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
        <SaveStatus state={state} dirty={formState.isDirty} />
        <DuncitButton onClick={onCancel} disabled={saving}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={saving} disabled={!formState.isDirty}>
          {t('shell.common.save')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
