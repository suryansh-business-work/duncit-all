import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, MenuItem, Stack, TextField } from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { makeFileDetailsSchema, NAME_MAX, VISIBILITIES, type FileDetailsOutput, type FileDetailsValues } from './file-details.types';

const VISIBILITY_KEYS = { PRIVATE: 'intel.media.visibility.PRIVATE', TEAM: 'intel.media.visibility.TEAM', ADMINS: 'intel.media.visibility.ADMINS' } as const;

export interface FileDetailsFormProps {
  values: FileDetailsValues;
  folders: string[];
  saving: boolean;
  disabled: boolean;
  errorMessage: string | null;
  onSubmit: (values: FileDetailsOutput) => void;
}

/** Rename, move and share a file (React Hook Form + Zod). */
export default function FileDetailsForm({ values, folders, saving, disabled, errorMessage, onSubmit }: Readonly<FileDetailsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeFileDetailsSchema(t), [t]);
  const { control, handleSubmit } = useForm<FileDetailsValues, unknown, FileDetailsOutput>({
    defaultValues: values,
    values,
    resolver: zodResolver(schema) as Resolver<FileDetailsValues, unknown, FileDetailsOutput>,
    mode: 'onTouched',
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={1.5}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <RhfTextField control={control} name="name" label={t('intel.media.details.name')} required disabled={disabled} slotProps={{ htmlInput: { maxLength: NAME_MAX } }} />
        <RhfTextField control={control} name="folder" label={t('intel.media.details.folder')} hint={t('intel.media.details.folderHint', { vars: { folders: folders.slice(0, 5).join(', ') } })} disabled={disabled} />
        <Controller
          control={control}
          name="visibility"
          render={({ field }) => (
            <TextField select label={t('intel.media.details.visibility')} value={field.value} onChange={field.onChange} onBlur={field.onBlur} disabled={disabled} helperText={t('intel.media.details.visibilityHint')}>
              {VISIBILITIES.map((v) => (
                <MenuItem key={v} value={v}>
                  {t(VISIBILITY_KEYS[v])}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <div>
          <DuncitButton type="submit" variant="contained" startIcon={<SaveIcon />} loading={saving || undefined} disabled={disabled}>
            {t('intel.common.save')}
          </DuncitButton>
        </div>
      </Stack>
    </form>
  );
}
