import { Box, MenuItem, Stack, TextField } from '@mui/material';
import MediaPickerField from '../../components/MediaPickerField';
import type { SliderForm } from './queries';

interface Props {
  form: SliderForm;
  setForm: React.Dispatch<React.SetStateAction<SliderForm>>;
}

export default function SliderBasicFields({ form, setForm }: Props) {
  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          fullWidth
          required
        />
        <TextField
          label="Slider ID"
          value={form.slider_id}
          onChange={(e) => setForm({ ...form, slider_id: e.target.value })}
          disabled={!!form.id}
          helperText={form.id ? 'Locked' : 'Auto if blank'}
          fullWidth
        />
      </Stack>
      <TextField
        label="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        fullWidth
        multiline
        minRows={2}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Box sx={{ flex: 1 }}>
          <MediaPickerField
            label="Media URL"
            value={form.media_url}
            onChange={(url) => setForm({ ...form, media_url: url })}
            folder="/sliders"
            required
          />
        </Box>
        <TextField
          select
          label="Type"
          value={form.media_type}
          onChange={(e) =>
            setForm({ ...form, media_type: e.target.value as 'IMAGE' | 'VIDEO' })
          }
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="IMAGE">Image</MenuItem>
          <MenuItem value="VIDEO">Video</MenuItem>
        </TextField>
      </Stack>
      <TextField
        label="Tap link / deeplink (optional)"
        value={form.link_url}
        onChange={(e) => setForm({ ...form, link_url: e.target.value })}
        fullWidth
        placeholder="https://… or duncit://club/abc"
      />
    </>
  );
}
