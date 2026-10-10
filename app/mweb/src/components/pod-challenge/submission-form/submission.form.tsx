import { useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormHelperText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { DuncitButton } from '@duncit/buttons';
import type { ChallengeMediaType } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { useAttachmentGate } from '../../../utils/uploadLimits';
import { buildSubmissionSchema, type SubmissionValues } from './submission.types';

export interface SubmissionFormProps {
  accepted: ChallengeMediaType[];
  allowCaption: boolean;
  /** Given to a host, who submits on a competitor's behalf; a competitor submits as themselves. */
  competitors?: { competitor_id: string; name: string }[];
  /** Whether the competitor already has an entry (the button then says it replaces it). */
  replacing: boolean;
  saving: boolean;
  /** Resolves true when the piece was uploaded and saved (the form then clears). */
  onSubmit: (values: SubmissionValues) => Promise<boolean>;
}

const EMPTY: SubmissionValues = { file: null, caption: '', competitor_id: '' };

export function SubmissionForm({ accepted, allowCaption, competitors, replacing, saving, onSubmit }: Readonly<SubmissionFormProps>) {
  const { t } = useTranslation();
  // The gate is a fresh function every render; the schema reads the latest
  // one through a ref instead of being rebuilt (and the form reset) each time.
  const tooLarge = useAttachmentGate();
  const gate = useRef(tooLarge);
  gate.current = tooLarge;
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pickCompetitor = !!competitors;
  const schema = useMemo(
    () => buildSubmissionSchema(t, { accepted, pickCompetitor, tooLarge: (file) => gate.current(file) }),
    [t, accepted, pickCompetitor]
  );
  const { control, handleSubmit, reset } = useForm<SubmissionValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const submit = async (values: SubmissionValues) => {
    if (await onSubmit(values)) reset(EMPTY);
  };
  const idleLabel = replacing ? t('mweb.challenge.tools.submitReplace') : t('mweb.challenge.tools.submit');

  return (
    <Stack spacing={1.5} component="form" noValidate onSubmit={handleSubmit(submit)}>
      {competitors && (
        <Controller
          name="competitor_id"
          control={control}
          render={({ field, fieldState }) => (
            <TextField select size="small" required label={t('mweb.challenge.judgeCompetitor')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message}>
              {competitors.map((c) => (
                <MenuItem key={c.competitor_id} value={c.competitor_id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      )}
      <Controller
        name="file"
        control={control}
        render={({ field, fieldState }) => (
          <Stack spacing={0.5}>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept={accepted.map((kind) => `${kind.toLowerCase()}/*`).join(',')}
              aria-label={t('mweb.challenge.tools.chooseFile')}
              onChange={(e) => {
                field.onChange(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <DuncitButton variant="outlined" startIcon={<UploadFileIcon />} disabled={saving} onClick={() => fileRef.current?.click()}>
              {t(field.value ? 'mweb.challenge.tools.replaceFile' : 'mweb.challenge.tools.chooseFile')}
            </DuncitButton>
            {field.value && (
              <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                {t('mweb.challenge.tools.fileChosen', { vars: { name: field.value.name } })}
              </Typography>
            )}
            {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
          </Stack>
        )}
      />
      {allowCaption && (
        <Controller
          name="caption"
          control={control}
          render={({ field, fieldState }) => (
            <TextField size="small" multiline label={t('mweb.challenge.tools.caption')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
          )}
        />
      )}
      <DuncitButton type="submit" variant="contained" disabled={saving}>
        {saving ? t('mweb.challenge.tools.uploading') : idleLabel}
      </DuncitButton>
    </Stack>
  );
}
