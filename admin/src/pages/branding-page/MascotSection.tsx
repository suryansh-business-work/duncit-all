import { Box, Stack, TextField, Typography } from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import LottiePreview from './LottiePreview';
import type { BrandingFormState } from './queries';

interface Props {
  form: BrandingFormState;
  setForm: (next: BrandingFormState) => void;
}

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'clean'],
  ],
};

const QUILL_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'color',
  'background',
  'list',
  'bullet',
  'link',
];

export default function MascotSection({ form, setForm }: Readonly<Props>) {
  const set = (k: keyof BrandingFormState, v: string) => setForm({ ...form, [k]: v });

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h6">Mascot</Typography>
        <Typography variant="body2" color="text.secondary">
          The face of the app — shown in the mWeb header, splash, and dialogs.
        </Typography>
      </Box>

      <TextField
        label="Mascot name"
        value={form.mascot_name}
        onChange={(e) => set('mascot_name', e.target.value)}
        fullWidth
      />

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          About the mascot
        </Typography>
        <Box
          sx={{
            '& .ql-toolbar': { borderTopLeftRadius: 8, borderTopRightRadius: 8 },
            '& .ql-container': { borderBottomLeftRadius: 8, borderBottomRightRadius: 8, minHeight: 160, fontSize: 14 },
            '& .ql-editor': { minHeight: 160 },
          }}
        >
          <ReactQuill
            theme="snow"
            value={form.mascot_description_html}
            onChange={(v) => set('mascot_description_html', v)}
            modules={QUILL_MODULES}
            formats={QUILL_FORMATS}
          />
        </Box>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Stack spacing={1} sx={{ flex: 1 }}>
          <TextField
            label="Mascot Lottie URL"
            value={form.mascot_lottie_url}
            onChange={(e) => set('mascot_lottie_url', e.target.value)}
            fullWidth
            helperText="Default: /lotties/mascot.json"
          />
          <LottiePreview src={form.mascot_lottie_url} fallbackPath="/lotties/mascot.json" caption="Mascot" />
        </Stack>
        <Stack spacing={1} sx={{ flex: 1 }}>
          <TextField
            label="Mascot on chair Lottie URL"
            value={form.mascot_on_chair_lottie_url}
            onChange={(e) => set('mascot_on_chair_lottie_url', e.target.value)}
            fullWidth
            helperText="Default: /lotties/mascot-on-chair.json"
          />
          <LottiePreview
            src={form.mascot_on_chair_lottie_url}
            fallbackPath="/lotties/mascot-on-chair.json"
            caption="Mascot on chair"
          />
        </Stack>
        <Stack spacing={1} sx={{ flex: 1 }}>
          <TextField
            label="Winner Lottie URL"
            value={form.mascot_winner_lottie_url}
            onChange={(e) => set('mascot_winner_lottie_url', e.target.value)}
            fullWidth
            helperText="Default: /lotties/winner.json"
          />
          <LottiePreview
            src={form.mascot_winner_lottie_url}
            fallbackPath="/lotties/winner.json"
            caption="Winner"
          />
        </Stack>
      </Stack>
    </Stack>
  );
}
