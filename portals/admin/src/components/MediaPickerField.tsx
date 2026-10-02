import {
  MediaPickerField as SharedMediaPickerField,
  type MediaPickerFieldProps,
} from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';

/**
 * The shared `@duncit/media-picker` field, bound to this portal's own copy —
 * the implementation lives in the package; only the wording is local.
 */
export default function MediaPickerField(props: Readonly<Omit<MediaPickerFieldProps, 'labels'>>) {
  const { t } = useTranslation();
  return (
    <SharedMediaPickerField
      {...props}
      labels={{
        placeholder: t('admin.pickers.mediaHint'),
        pick: t('admin.pickers.mediaPick'),
        open: t('admin.pickers.open'),
      }}
    />
  );
}
