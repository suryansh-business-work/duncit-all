import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Stack } from '@mui/material';
import { SingleImageUploadField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/app-settings';
import {
  defaultMediaSchema,
  type DefaultMediaFormProps,
  type DefaultMediaValues,
} from './default-media.types';

/** Where an uploaded default lands in ImageKit. */
const UPLOAD_FOLDER = '/whatsapp';

/**
 * One field: the image every media-header scenario sends when it has none of
 * its own. Upload a file, or paste a public link; Save writes it, Clear
 * removes it. The field follows the server until the operator types — a
 * refetch after a save resets to the same value, so it never fights an edit.
 */
export default function DefaultMediaForm({
  savedUrl,
  busy,
  onSubmit,
}: Readonly<DefaultMediaFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => defaultMediaSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isValid },
  } = useForm<DefaultMediaValues>({
    defaultValues: { url: savedUrl },
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  useEffect(() => {
    reset({ url: savedUrl });
  }, [savedUrl, reset]);

  const url = watch('url').trim();
  const dirty = url !== savedUrl;
  const submit = handleSubmit((values) => onSubmit({ url: values.url.trim() }));

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={2}>
        <Controller
          control={control}
          name="url"
          render={({ field, fieldState }) => (
            <SingleImageUploadField
              variant="url-adornment"
              label={t('marketingWhatsapp.defaultMedia.label')}
              value={field.value}
              onChange={field.onChange}
              folder={UPLOAD_FOLDER}
              disabled={busy}
              error={!!fieldState.error}
              helperText={
                fieldState.error?.message ?? t('marketingWhatsapp.defaultMedia.hint')
              }
            />
          )}
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          {savedUrl && (
            <Button
              type="button"
              color="error"
              disabled={busy}
              onClick={() => onSubmit({ url: '' })}
            >
              {t('marketingWhatsapp.defaultMedia.clear')}
            </Button>
          )}
          <Button type="submit" variant="contained" disabled={busy || !dirty || !url || !isValid}>
            {t('marketingWhatsapp.defaultMedia.save')}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
