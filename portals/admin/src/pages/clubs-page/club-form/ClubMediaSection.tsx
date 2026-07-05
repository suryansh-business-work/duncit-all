import { FormHelperText, Stack } from '@mui/material';
import MediaListField from '../../../components/MediaListField';
import type { ClubForm } from '../queries';
import type { ClubErrors } from './clubValidation';

interface Props {
  form: ClubForm;
  setForm: (f: ClubForm | ((prev: ClubForm) => ClubForm)) => void;
  errors?: ClubErrors;
}

export default function ClubMediaSection({ form, setForm, errors }: Readonly<Props>) {
  return (
    <Stack spacing={2}>
      <div>
        <MediaListField label="Feature images & videos" value={form.feature_text} onChange={(value) => setForm({ ...form, feature_text: value })} folder="/clubs" helperText="Cover/header media shown on the club page — at least one image is required." />
        {errors?.feature_text && <FormHelperText error>{errors.feature_text}</FormHelperText>}
      </div>
      <MediaListField label="Club moments" value={form.moments_text} onChange={(value) => setForm({ ...form, moments_text: value })} folder="/clubs/moments" helperText="Past event photos." />
    </Stack>
  );
}