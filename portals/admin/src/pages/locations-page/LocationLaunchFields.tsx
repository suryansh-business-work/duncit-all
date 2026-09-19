import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from '@duncit/shell';
import LaunchMediaFields from './LaunchMediaFields';
import { hasLaunchMediaOverride, launchTargetError, whatsappGroupUrlError, type LocForm } from './types';

interface Props {
  form: LocForm;
  setForm: React.Dispatch<React.SetStateAction<LocForm>>;
}

/**
 * The Launch Settings group of the location dialog: whether the city is live
 * in the app, and what its launch waitlist page shows while it is not — the
 * goal ("We'll launch once X people…"), an optional city WhatsApp group, and
 * the city's own backdrops over the global launch page media.
 */
export default function LocationLaunchFields({ form, setForm }: Readonly<Props>) {
  const { t } = useTranslation();
  const targetError = launchTargetError(form.launch_target);
  const groupError = whatsappGroupUrlError(form.whatsapp_group_url);
  const launchedLabel = form.is_launched ? t('admin.locations.launched') : t('admin.locations.notLaunched');

  return (
    <Stack
      component="fieldset"
      spacing={2}
      data-testid="location-form-launch-settings"
      sx={{ m: 0, p: 2, border: 1, borderColor: 'divider', borderRadius: 2, minWidth: 0 }}
    >
      <Box component="legend" sx={{ px: 0.5 }}>
        <Typography component="span" variant="subtitle1" sx={{ fontWeight: 600 }}>
          {t('admin.locations.launchSettings')}
        </Typography>
      </Box>
      <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
        {t('admin.locations.launchSettingsHint')}
      </Typography>

      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Switch
            slotProps={{
              input: {
                'aria-label': t('admin.locations.launched'),
                'data-testid': 'location-form-launched',
              } as Record<string, string>,
            }}
            checked={form.is_launched}
            onChange={(_, v) => setForm((prev) => ({ ...prev, is_launched: v }))}
          />
          <Typography variant="body2">{launchedLabel}</Typography>
        </Stack>
        <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
          {t('admin.locations.launchedHint')}
        </Typography>
      </Box>

      {/* Two equal columns from the same top edge, so the two helper lines
          start level however long either one runs. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
        <TextField
          type="number"
          label={t('admin.locations.launchTarget')}
          value={form.launch_target}
          onChange={(e) => setForm((prev) => ({ ...prev, launch_target: e.target.value }))}
          error={Boolean(targetError)}
          helperText={targetError ? t(targetError) : t('admin.locations.launchTargetHint')}
          required
          fullWidth
          slotProps={{
            htmlInput: { min: 1, step: 1, inputMode: 'numeric', 'data-testid': 'location-form-launch-target' },
          }}
        />
        <TextField
          type="url"
          label={t('admin.locations.whatsappGroupUrl')}
          value={form.whatsapp_group_url}
          onChange={(e) => setForm((prev) => ({ ...prev, whatsapp_group_url: e.target.value }))}
          error={Boolean(groupError)}
          helperText={groupError ? t(groupError) : t('admin.locations.whatsappGroupUrlHint')}
          fullWidth
          slotProps={{ htmlInput: { 'data-testid': 'location-form-whatsapp-group-url' } }}
        />
      </Box>

      <Accordion
        disableGutters
        defaultExpanded={hasLaunchMediaOverride(form.launch_media)}
        data-testid="location-form-launch-media"
        sx={{ '&::before': { display: 'none' }, border: 1, borderColor: 'divider', boxShadow: 'none' }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box>
            <Typography variant="subtitle2">{t('admin.locations.launchMediaOverride')}</Typography>
            <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
              {t('admin.locations.launchMediaOverrideHint')}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <LaunchMediaFields
            value={form.launch_media}
            onChange={(launch_media) => setForm((prev) => ({ ...prev, launch_media }))}
            folder="/locations/launch"
            testIdPrefix="location-form-launch-media"
          />
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
