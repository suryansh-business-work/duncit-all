import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { AiMonitoringForm, type AiMonitoringFormValues } from '../../../forms/ai-monitoring';
import {
  AI_MONITORING_SETTINGS,
  UPDATE_AI_MONITORING_SETTINGS,
  type AiMonitoringSettings,
} from '../queries';

interface Data {
  aiMonitoringSettings: AiMonitoringSettings;
}

/** Server shape -> form shape. The bullet list is one textarea, one per line. */
function toFormValues(settings: AiMonitoringSettings): Partial<AiMonitoringFormValues> {
  return {
    chip_enabled: settings.chip_enabled,
    chip_label: settings.chip_label ?? '',
    dialog_title: settings.dialog_title ?? '',
    dialog_intro: settings.dialog_intro ?? '',
    dialog_points: settings.dialog_points.join('\n'),
    dialog_footnote: settings.dialog_footnote ?? '',
    dismiss_label: settings.dismiss_label ?? '',
    image_prompt: settings.image_prompt,
  };
}

/**
 * AI Monitoring > Settings — the one place the notice and the check are
 * configured. Everything the shared @duncit/ai-monitoring package renders, on
 * every surface, is decided on this page.
 */
export default function AiMonitoringSettingsPage() {
  const { data, loading, error } = useQuery<Data>(AI_MONITORING_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save, { loading: saving }] = useMutation(UPDATE_AI_MONITORING_SETTINGS);

  const settings = data?.aiMonitoringSettings;
  const initialValues = useMemo(
    () => (settings ? toFormValues(settings) : undefined),
    [settings],
  );

  const onSubmit = async (values: AiMonitoringFormValues) => {
    try {
      await save({
        variables: {
          input: {
            chip_enabled: values.chip_enabled,
            chip_label: values.chip_label,
            dialog_title: values.dialog_title,
            dialog_intro: values.dialog_intro,
            dialog_points: values.dialog_points
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean),
            dialog_footnote: values.dialog_footnote,
            dismiss_label: values.dismiss_label,
            image_prompt: values.image_prompt,
          },
        },
      });
      notifySuccess('AI Monitoring settings saved');
    } catch (err) {
      notifyError(parseApiError(err, 'Could not save AI Monitoring settings'));
    }
  };

  return (
    <Box>
      <Stack sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          AI Monitoring Settings
        </Typography>
        <Typography variant="caption" color="text.secondary">
          The wording shown beside every upload field, and the prompt every uploaded image is
          analysed with. Both apply everywhere the shared AI Monitoring package is used.
        </Typography>
      </Stack>

      <QueryGuard loading={loading && !settings} error={error}>
        <AiMonitoringForm
          initialValues={initialValues}
          submitting={saving}
          scanModel={settings?.image_scan_model}
          promptKey={settings?.image_prompt_key}
          onSubmit={onSubmit}
        />
      </QueryGuard>
    </Box>
  );
}
