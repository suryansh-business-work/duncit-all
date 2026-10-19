import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Box } from '@mui/material';
import { SingleImageUploadField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';
import type { ImageFit } from '../../lib/image-fit';
import { useFitCapture } from './useFitCapture';

interface RhfImageFieldProps<T extends FieldValues> {
  control: Control<T>;
  /** Holds the image URL. */
  name: Path<T>;
  label: string;
  hint?: string;
  required?: boolean;
  /** Stable hook for tests on the upload control. */
  testId?: string;
  /** Resize (and crop) an uploaded picture to this size first; the hint names the size. */
  fit?: ImageFit;
}

/** The ImageKit folder every picture this console uploads lands in. */
export const STORE_MEDIA_FOLDER = '/pet-store';

/** An image URL: paste one, or upload a file and the field fills itself. */
export default function RhfImageField<T extends FieldValues>({ control, name, label, hint, required, testId, fit }: Readonly<RhfImageFieldProps<T>>) {
  const { t } = useTranslation();
  const capture = useFitCapture(fit);
  const fitHint = fit ? t('ecommPortal.form.fitHint', { vars: { width: fit.width, height: fit.height } }) : '';
  const fullHint = [hint, fitHint].filter(Boolean).join(' ') || ' ';
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Box onChangeCapture={capture.onChangeCapture}>
          <SingleImageUploadField
            label={label}
            value={field.value ?? ''}
            onChange={field.onChange}
            folder={STORE_MEDIA_FOLDER}
            required={required}
            error={Boolean(fieldState.error ?? capture.error)}
            helperText={fieldState.error?.message ?? capture.error ?? fullHint}
            uploadTestId={testId}
          />
        </Box>
      )}
    />
  );
}
