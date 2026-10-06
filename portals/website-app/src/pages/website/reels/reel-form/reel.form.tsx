import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, DialogActions, FormControlLabel, Stack, Switch } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { WebsiteReelRow } from '../queries';
import ReelVideoField from './ReelVideoField';
import {
  blankReelValues,
  reelSchema,
  toReelFormValues,
  type ReelFormOutput,
  type ReelFormValues,
} from './reel.types';

interface Props {
  reel: WebsiteReelRow | null;
  maxMb: number;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: ReelFormOutput) => void;
  onCancel: () => void;
}

/** Title, description, the video itself, order and visibility for one reel. */
export default function ReelForm({ reel, maxMb, submitting, errorMessage, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => reelSchema((key) => t(key)), [t]);
  const { control, handleSubmit, setValue, watch } = useForm<ReelFormValues, unknown, ReelFormOutput>({
    defaultValues: reel ? toReelFormValues(reel) : blankReelValues(),
    resolver: zodResolver(schema) as Resolver<ReelFormValues, unknown, ReelFormOutput>,
    mode: 'onTouched',
  });
  const sizeBytes = watch('file_size_bytes');

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2} sx={{ mt: 1 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <Controller
          control={control}
          name="video_url"
          render={({ field, fieldState }) => (
            <ReelVideoField
              value={field.value}
              sizeBytes={sizeBytes}
              maxMb={maxMb}
              error={fieldState.error?.message}
              onUploaded={(url, bytes) => {
                field.onChange(url);
                setValue('file_size_bytes', bytes);
              }}
            />
          )}
        />
        <RhfTextField
          control={control}
          name="title"
          label={t('websiteApp.reels.fieldTitle')}
          hint={t('websiteApp.reels.fieldTitleHint')}
          slotProps={{ htmlInput: { maxLength: 80 } }}
        />
        <RhfTextField
          control={control}
          name="description"
          label={t('websiteApp.reels.fieldDescription')}
          hint={t('websiteApp.reels.fieldDescriptionHint')}
          multiline
          minRows={2}
          slotProps={{ htmlInput: { maxLength: 240 } }}
        />
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <RhfTextField
            control={control}
            name="sort_order"
            label={t('websiteApp.reels.fieldSortOrder')}
            hint={t('websiteApp.reels.fieldSortOrderHint')}
            type="number"
            sx={{ maxWidth: 180 }}
          />
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                label={t('websiteApp.reels.fieldActive')}
              />
            )}
          />
        </Stack>
      </Stack>
      <DialogActions sx={{ px: 0, pt: 3 }}>
        <DuncitButton onClick={onCancel} disabled={submitting}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" disabled={submitting}>
          {submitting ? t('shell.common.saving') : t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
