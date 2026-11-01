import { useFormContext, useWatch } from 'react-hook-form';
import { Alert, ListItemText, MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { EM_DASH } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import type { OutreachWaTemplate } from '../queries';
import type { SequenceFormValues } from './sequence.types';

interface Props {
  index: number;
  templates: readonly OutreachWaTemplate[];
  disabled: boolean;
}

/**
 * The WhatsApp step: a campaign from the Communications portal's list — only
 * an approved one can be picked — and the values its template takes. Templates
 * are made and approved in Communications, never here.
 */
export default function WaTemplateField({ index, templates, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = useFormContext<SequenceFormValues>();
  const key = useWatch({ control, name: `steps.${index}.wa_template_key` });
  const chosen = templates.find((row) => row.key === key) ?? null;

  return (
    <Stack spacing={2}>
      {templates.length === 0 && (
        <Alert severity="warning" data-testid="wa-templates-empty">
          {t('marketing.outreach.noTemplates')}
        </Alert>
      )}
      <RhfTextField
        control={control}
        name={`steps.${index}.wa_template_key`}
        select
        label={t('marketing.outreach.template')}
        hint={t('marketing.outreach.templateHint')}
        disabled={disabled}
        fullWidth
        data-testid={`step-${index}-template`}
      >
        {templates.map((row) => (
          <MenuItem key={row.key} value={row.key} disabled={!row.approved}>
            <ListItemText
              primary={row.key}
              secondary={row.approved ? row.description : t('marketing.outreach.templateUnapproved', { vars: { status: row.status || EM_DASH } })}
            />
          </MenuItem>
        ))}
      </RhfTextField>
      {chosen?.body && (
        <Alert severity="info" data-testid={`step-${index}-template-body`}>
          {chosen.body}
        </Alert>
      )}
      <RhfTextField
        control={control}
        name={`steps.${index}.wa_params`}
        label={t('marketing.outreach.waParams')}
        hint={
          chosen && chosen.param_count > 0
            ? t('marketing.outreach.waParamsCount', { vars: { count: String(chosen.param_count) } })
            : t('marketing.outreach.waParamsHint')
        }
        disabled={disabled}
        fullWidth
        multiline
        minRows={2}
      />
    </Stack>
  );
}
