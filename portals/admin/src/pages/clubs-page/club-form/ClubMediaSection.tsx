import { Stack } from '@mui/material';
import MediaListField from '../../../components/MediaListField';
import type { ClubForm } from '../queries';

interface Props {
  form: ClubForm;
  setForm: (f: ClubForm | ((prev: ClubForm) => ClubForm)) => void;
}

export default function ClubMediaSection({ form, setForm }: Readonly<Props>) {
  return (
    <Stack spacing={2}>
      <MediaListField label="Feature images & videos" value={form.feature_text} onChange={(value) => setForm({ ...form, feature_text: value })} folder="/clubs" helperText="Cover/header media shown on club page." />
      <MediaListField label="Club moments" value={form.moments_text} onChange={(value) => setForm({ ...form, moments_text: value })} folder="/clubs/moments" helperText="Past event photos." />
    </Stack>
  );
}