import { useEffect, useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { SingleImageUploadField } from '@duncit/media-picker';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import {
  defaultMediaSchema,
  type DefaultMediaFormProps,
  type DefaultMediaValues,
} from './default-media.types';

/** Where an uploaded default lands in ImageKit. */
const UPLOAD_FOLDER = '/whatsapp';

/**
 * One platform default header asset: the file every media-header scenario of
 * that kind sends when it has none of its own. Upload or paste a public link;
 * Save writes it, Clear removes it. The field follows the server until the
 * operator types — a refetch after a save resets to the same value, so it never
 * fights an edit.
 *
 * An image gets the uploader; a document is a pasted link, because the
 * recipient reads its file NAME and only the operator knows what that should
 * say.
 */
export default function DefaultMediaForm({
  kind,
  savedUrl,
  savedFilename,
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
  } = useForm<DefaultMediaValues, any, DefaultMediaValues>({
    defaultValues: { url: savedUrl, filename: savedFilename },
    resolver: zodResolver(schema) as unknown as Resolver<DefaultMediaValues, any, DefaultMediaValues>,
    mode: 'onChange',
  });

  useEffect(() => {
    reset({ url: savedUrl, filename: savedFilename });
  }, [savedUrl, savedFilename, reset]);

  const url = watch('url').trim();
  const filename = watch('filename').trim();
  const dirty = url !== savedUrl || filename !== savedFilename;
  const isImage = kind === 'IMAGE';
  const submit = handleSubmit((values) =>
    onSubmit({ url: values.url.trim(), filename: values.filename.trim() })
  );

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={2}>
        {isImage ? (
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
                helperText={fieldState.error?.message ?? t('marketingWhatsapp.defaultMedia.hint')}
              />
            )}
          />
        ) : (
          <>
            <RhfTextField
              control={control}
              name="url"
              label={t('marketingWhatsapp.defaultMedia.documentLabel')}
              disabled={busy}
              hint={t('marketingWhatsapp.defaultMedia.documentHint')}
            />
            <RhfTextField
              control={control}
              name="filename"
              label={t('marketingWhatsapp.defaultMedia.documentFilenameLabel')}
              disabled={busy}
              hint={t('marketingWhatsapp.defaultMedia.documentFilenameHint')}
            />
          </>
        )}
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          {savedUrl && (
            <DuncitButton
              type="button"
              color="error"
              disabled={busy}
              onClick={() => onSubmit({ url: '', filename: '' })}
            >
              {t('marketingWhatsapp.defaultMedia.clear')}
            </DuncitButton>
          )}
          <DuncitButton type="submit" variant="contained" disabled={busy || !dirty || !url || !isValid}>
            {t('marketingWhatsapp.defaultMedia.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
