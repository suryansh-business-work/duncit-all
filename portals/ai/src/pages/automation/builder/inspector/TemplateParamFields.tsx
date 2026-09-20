import { Controller, type Control, type UseFormWatch } from 'react-hook-form';
import { Box, Chip, Stack, TextField, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { AisensyTemplateButton, AisensyTemplateOption } from '../../types';
import type { WhatsappValues } from './schemas';

interface Props {
  control: Control<WhatsappValues>;
  watch: UseFormWatch<WhatsappValues>;
  template: AisensyTemplateOption | null;
  paramCount: number;
  /** The CTA buttons whose link carries a {{n}}, with their position on the template. */
  dynamicButtons: ReadonlyArray<AisensyTemplateButton & { index: number }>;
}

/** The body with the typed values in place — `{{1}}` stays visible until filled. */
function preview(template: AisensyTemplateOption, params: readonly string[]): string {
  const body = template.body.replaceAll(/\{\{(\d+)\}\}/g, (whole, n: string) => params[Number(n) - 1] || whole);
  return [template.header, body, template.footer].filter(Boolean).join('\n\n');
}

/**
 * One field per template variable, one per dynamic button link, and the message
 * as it will read. Text may carry {{variables}}; the run fills them per contact.
 */
export default function TemplateParamFields({ control, watch, template, paramCount, dynamicButtons }: Readonly<Props>) {
  const { t } = useTranslation();
  const params = watch('template_params') ?? [];
  if (!template) return null;

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('ai.automation.inspector.whatsapp.template')}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
          <Chip size="small" label={template.name} />
          <Chip size="small" variant="outlined" label={template.category} />
          <Chip size="small" variant="outlined" label={template.language} />
        </Stack>
      </Box>
      {Array.from({ length: paramCount }, (_unused, index) => (
        <RhfTextField
          key={`param-${index + 1}`}
          control={control}
          name={`template_params.${index}` as const}
          label={t('ai.automation.inspector.whatsapp.param', { vars: { n: index + 1 } })}
          hint={t('ai.automation.inspector.whatsapp.paramHint')}
          size="small"
        />
      ))}
      {dynamicButtons.map((button, position) => (
        <Controller
          key={`button-${button.index}`}
          control={control}
          name="buttons"
          render={({ field }) => {
            const rows = field.value ?? [];
            const current = rows.find((row) => row.index === button.index)?.value ?? '';
            return (
              <TextField
                size="small"
                fullWidth
                label={t('ai.automation.inspector.whatsapp.button', { vars: { n: position + 1 } })}
                helperText={`${button.text} — ${t('ai.automation.inspector.whatsapp.buttonHint')}`}
                value={current}
                onChange={(event) => {
                  const next = rows.filter((row) => row.index !== button.index);
                  if (event.target.value) next.push({ index: button.index, value: event.target.value });
                  field.onChange(next);
                }}
              />
            );
          }}
        />
      ))}
      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('ai.automation.inspector.whatsapp.preview')}
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
          {preview(template, params)}
        </Typography>
        {template.buttons.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
            {template.buttons.map((label) => (
              <Chip key={label} size="small" variant="outlined" label={label} />
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
