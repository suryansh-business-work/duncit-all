import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { UploadSettings } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  settings: UploadSettings;
  saving: boolean;
  onSave: (input: Record<string, unknown>) => void;
}

/**
 * Accordion 5 — whether uploads from THIS surface are screened by AI.
 *
 * Only the switch lives here. Everything else about AI Monitoring — the wording
 * shown to the person uploading, the prompt the model runs, and the full
 * check history — is owned by AI Portal > AI Monitoring, so there is one place
 * to configure it and one place to read it rather than a copy per portal.
 */
export default function AiMonitoringAccordion({ settings, saving, onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{
          fontWeight: 700
        }}>{t('admin.uploads.aiTitle')}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.ai_image_monitoring_enabled}
                disabled={saving}
                onChange={(e) => onSave({ ai_image_monitoring_enabled: e.target.checked })}
              />
            }
            label={t('admin.uploads.aiReview')}
          />
          <Alert severity="info">
            The monitoring history — every image checked, who uploaded it, what the model said and
            what was done about it — lives in <b>{t('admin.uploads.aiLogsPath')}</b>. The
            notice shown to people uploading, and the prompt each image is analysed with, are
            configured in <b>{t('admin.uploads.aiSettingsPath')}</b>.
          </Alert>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
