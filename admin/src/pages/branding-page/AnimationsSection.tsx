import { Box, Stack, TextField, Typography } from '@mui/material';
import LottiePreview from './LottiePreview';
import type { BrandingFormState } from './queries';

interface Props {
  form: BrandingFormState;
  setForm: (next: BrandingFormState) => void;
}

export default function AnimationsSection({ form, setForm }: Props) {
  const set = (k: keyof BrandingFormState, v: string) => setForm({ ...form, [k]: v });

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h6">Animations</Typography>
        <Typography variant="body2" color="text.secondary">
          Lottie animations used across module welcome, app loading, and pod-join confetti.
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Stack spacing={1} sx={{ flex: 1 }}>
          <TextField
            label="Welcome Lottie URL"
            value={form.welcome_lottie_url}
            onChange={(e) => set('welcome_lottie_url', e.target.value)}
            fullWidth
            helperText="Shown when admin opens a module. Default: /lotties/welcome.json"
          />
          <LottiePreview src={form.welcome_lottie_url} fallbackPath="/lotties/welcome.json" caption="Welcome" />
        </Stack>
        <Stack spacing={1} sx={{ flex: 1 }}>
          <TextField
            label="App loader Lottie URL"
            value={form.app_loader_lottie_url}
            onChange={(e) => set('app_loader_lottie_url', e.target.value)}
            fullWidth
            helperText="Shown on mWeb splash. Default: /lotties/mascot.json"
          />
          <LottiePreview
            src={form.app_loader_lottie_url}
            fallbackPath="/lotties/mascot.json"
            caption="App loader"
          />
        </Stack>
        <Stack spacing={1} sx={{ flex: 1 }}>
          <TextField
            label="Confetti Lottie URL"
            value={form.confetti_lottie_url}
            onChange={(e) => set('confetti_lottie_url', e.target.value)}
            fullWidth
            helperText="Shown after a user joins a pod. Default: /lotties/confetti.json"
          />
          <LottiePreview
            src={form.confetti_lottie_url}
            fallbackPath="/lotties/confetti.json"
            caption="Confetti"
          />
        </Stack>
      </Stack>
    </Stack>
  );
}
