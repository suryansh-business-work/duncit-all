import { useEffect, useMemo } from 'react';
import { Controller } from 'react-hook-form';
import { Alert, Autocomplete, Stack, TextField } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { AisensyTemplateOption } from '../../types';
import type { ConfigProps } from './config-props';
import { str, strList, whatsappSchema, type WhatsappValues } from './schemas';
import { useNodeForm } from './useNodeForm';
import TemplateParamFields from './TemplateParamFields';

const MEDIA_HEADERS = new Set(['IMAGE', 'VIDEO', 'FILE', 'DOCUMENT']);

const toValues = (config: Record<string, unknown>): WhatsappValues => ({
  campaign_name: str(config.campaign_name),
  template_params: strList(config.template_params),
  media_url: str(config.media_url),
  media_filename: str(config.media_filename),
  buttons: Array.isArray(config.buttons)
    ? config.buttons.map((row) => ({ index: Number((row as { index?: unknown })?.index ?? 0) || 0, value: str((row as { value?: unknown })?.value) }))
    : [],
});

/**
 * Send WhatsApp template — the step picks an AiSensy CAMPAIGN, and the campaign
 * decides the template. The names come from the Project API when Tech has
 * connected it; a name may also be typed, because the send key alone can send
 * to a campaign the read API has never listed.
 */
export default function WhatsappSendConfig({ nodeId, config, options, onChange }: Readonly<ConfigProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => whatsappSchema(), []);
  const { control, watch, setValue } = useNodeForm(nodeId, schema, toValues(config), (next) => onChange({ ...config, ...next }));
  const campaignName = watch('campaign_name');

  const names = useMemo(
    () => [...new Set([...options.campaigns.map((row) => row.name), ...options.saved_campaign_names.map((row) => row.name)])],
    [options]
  );
  const campaign = options.campaigns.find((row) => row.name === campaignName) ?? null;
  const template: AisensyTemplateOption | null = campaign
    ? options.templates.find((row) => row.name === campaign.template_name) ?? null
    : null;
  const paramCount = template?.param_count ?? 0;
  const needsMedia = Boolean(template && (template.needs_media || MEDIA_HEADERS.has(template.header_format) || campaign?.media_url));
  const dynamicButtons = useMemo(
    () => (template?.cta_buttons ?? []).map((button, index) => ({ ...button, index })).filter((button) => button.url_param > 0),
    [template]
  );

  // The template says how many variables a message takes; keep the list that long.
  useEffect(() => {
    if (!template) return;
    const current = strList(config.template_params);
    if (current.length === paramCount) return;
    const resized = Array.from({ length: paramCount }, (_unused, index) => current[index] ?? '');
    setValue('template_params', resized, { shouldDirty: true });
    onChange({ ...config, template_params: resized });
    // Only when the template's arity changes — not on every keystroke in a param.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.name, paramCount]);

  return (
    <Stack spacing={2}>
      {!options.whatsapp_configured && <Alert severity="warning">{t('ai.automation.inspector.whatsapp.notConfigured')}</Alert>}
      <Controller
        control={control}
        name="campaign_name"
        render={({ field, fieldState }) => (
          <Autocomplete
            freeSolo
            data-testid="automation-whatsapp-campaign"
            options={names}
            value={field.value}
            onChange={(_event, value) => field.onChange(value ?? '')}
            onInputChange={(_event, value, reason) => {
              if (reason === 'input' || reason === 'clear') field.onChange(value);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('ai.automation.inspector.whatsapp.campaign')}
                size="small"
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? t('ai.automation.inspector.whatsapp.campaignHint')}
              />
            )}
          />
        )}
      />
      {campaignName && !template && options.project_configured && (
        <Alert severity="info">{t('ai.automation.inspector.whatsapp.templateUnknown')}</Alert>
      )}
      <TemplateParamFields control={control} template={template} paramCount={paramCount} dynamicButtons={dynamicButtons} watch={watch} />
      {needsMedia && (
        <>
          <RhfTextField
            control={control}
            name="media_url"
            label={t('ai.automation.inspector.whatsapp.media')}
            hint={t('ai.automation.inspector.whatsapp.mediaHint')}
            size="small"
          />
          <RhfTextField control={control} name="media_filename" label={t('ai.automation.inspector.whatsapp.mediaFilename')} size="small" />
        </>
      )}
    </Stack>
  );
}
