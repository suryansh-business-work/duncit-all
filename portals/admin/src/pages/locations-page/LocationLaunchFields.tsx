import { Box, Stack, Switch, TextField, Typography } from '@mui/material';
import { launchTargetError, whatsappGroupUrlError, type LocForm } from './types';
import { useTranslation } from '@duncit/shell';

interface Props {
  form: LocForm;
  setForm: React.Dispatch<React.SetStateAction<LocForm>>;
}

/**
 * Whether the city is live in the app, and what its launch waitlist page shows
 * while it is not: the goal ("We'll launch once X people…") and an optional
 * city WhatsApp group.
 */
export default function LocationLaunchFields({ form, setForm }: Readonly<Props>) {
  const { t } = useTranslation();
  const targetError = launchTargetError(form.launch_target);
  const groupError = whatsappGroupUrlError(form.whatsapp_group_url);
  const launchedLabel = form.is_launched ? t('admin.locations.launched') : t('admin.locations.notLaunched');

  return (
    <Stack spacing={2}>
      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Switch
            slotProps={{ input: { 'aria-label': t('admin.locations.launched'), 'data-testid': 'location-form-launched' } as Record<string, string> }}
            checked={form.is_launched}
            onChange={(_, v) => setForm((prev) => ({ ...prev, is_launched: v }))}
          />
          <Typography variant="body2">{launchedLabel}</Typography>
        </Stack>
        <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
          {t('admin.locations.launchedHint')}
        </Typography>
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          type="number"
          label={t('admin.locations.launchTarget')}
          value={form.launch_target}
          onChange={(e) => setForm((prev) => ({ ...prev, launch_target: e.target.value }))}
          error={Boolean(targetError)}
          helperText={targetError ? t(targetError) : t('admin.locations.launchTargetHint')}
          required
          slotProps={{ htmlInput: { min: 1, step: 1, inputMode: 'numeric', 'data-testid': 'location-form-launch-target' } }}
          sx={{ width: { xs: '100%', sm: 260 } }}
        />
        <TextField
          type="url"
          label={t('admin.locations.whatsappGroupUrl')}
          value={form.whatsapp_group_url}
          onChange={(e) => setForm((prev) => ({ ...prev, whatsapp_group_url: e.target.value }))}
          error={Boolean(groupError)}
          helperText={groupError ? t(groupError) : t('admin.locations.whatsappGroupUrlHint')}
          slotProps={{ htmlInput: { 'data-testid': 'location-form-whatsapp-group-url' } }}
          fullWidth
        />
      </Stack>
    </Stack>
  );
}
