import { useFormikContext } from 'formik';
import MediaListField from '../../../components/MediaListField';
import type { PodForm } from '../queries';

export default function MediaSection() {
  const { values, setFieldValue } = useFormikContext<PodForm>();
  return (
    <MediaListField
      label="Images & videos"
      value={values.media_text}
      onChange={(v) => setFieldValue('media_text', v)}
      folder="/pods"
      helperText="Cover image first; rest become a gallery."
    />
  );
}
