import { useController, useFormContext } from 'react-hook-form';
import { MB, SingleImageUploadField, useUploadCaps } from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';

interface Props {
  name: string;
  label?: string;
  helperText?: string;
  /** Image-kit folder used for organisation in the bucket. */
  folder?: string;
  /** Render as a circular avatar (host profile photo) vs. a square preview. */
  shape?: 'circle' | 'square';
}

type Translate = ReturnType<typeof useTranslation>['t'];

const oversizeMessage = (t: Translate, maxBytes: number) =>
  t('crm.emailTemplates.maxSizeCompressAndTryAgain', {
    vars: { max: Math.round(maxBytes / MB) },
  });

/**
 * Upload-an-image field bound to react-hook-form. Stores the resulting ImageKit
 * URL. Thin wrapper over the shared @duncit/media-picker SingleImageUploadField
 * (avatar variant — no raw URL paste, everything goes through ImageKit).
 */
export default function ImageUploadField({
  name,
  label,
  helperText,
  folder = 'crm',
  shape = 'square',
}: Readonly<Props>) {
  const { t } = useTranslation();
  const labelText = label ?? t('crm.forms.image');
  const { control } = useFormContext();
  const caps = useUploadCaps('PORTALS');
  const { field } = useController({ control, name });

  return (
    <SingleImageUploadField
      variant="avatar"
      label={labelText}
      value={field.value ?? ''}
      onChange={field.onChange}
      folder={folder}
      helperText={helperText}
      shape={shape}
      oversizeMessage={() => oversizeMessage(t, caps.maxImageBytes)}
      fallbackMimeType="image/png"
      uploadTestId={`upload-${name}`}
    />
  );
}
