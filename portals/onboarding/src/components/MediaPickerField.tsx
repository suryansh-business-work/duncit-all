import {
  MediaPickerField as SharedMediaPickerField,
  type MediaPickerFieldProps,
} from '@duncit/media-picker';
import { useTranslation } from '@duncit/app-settings';

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
        placeholder: t('onboarding.mediaPickerField.clickTheImageIconToUpload'),
        pick: t('onboarding.mediaPickerField.pickFromDeviceOrPexels'),
        open: t('onboarding.mediaPickerField.open'),
      }}
    />
  );
}
