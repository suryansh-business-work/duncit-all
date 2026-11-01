import type { ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Paper, Stack, Tooltip, Typography } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { OUTREACH_LIMITS, STEP_KIND_LABEL } from '../copy';
import type { OutreachStepKind, OutreachWaTemplate } from '../queries';
import WaTemplateField from './WaTemplateField';
import DraftStepButton from './DraftStepButton';
import type { SequenceFormValues } from './sequence.types';

interface Props {
  index: number;
  count: number;
  disabled: boolean;
  templates: readonly OutreachWaTemplate[];
  sequenceId: string | null;
  savedKind: OutreachStepKind | null;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

function StepButton({ title, onClick, disabled, children }: Readonly<{ title: string; onClick: () => void; disabled: boolean; children: ReactNode }>) {
  return (
    <Tooltip title={title}>
      <span>
        <DuncitIconButton size="small" aria-label={title} onClick={onClick} disabled={disabled}>
          {children}
        </DuncitIconButton>
      </span>
    </Tooltip>
  );
}

/** One step: its kind, what it sends (or how long it waits), and where it sits in the list. */
export default function StepCard({ index, count, disabled, templates, sequenceId, savedKind, onMove, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = useFormContext<SequenceFormValues>();
  const kind = useWatch({ control, name: `steps.${index}.kind` });
  const name = (field: 'subject' | 'body' | 'wait_days') => `steps.${index}.${field}` as const;
  const number = String(index + 1);

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid={`step-${index}`}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }} data-testid={`step-${index}-title`}>
          {t('marketing.outreach.stepTitle', { vars: { number, kind: t(STEP_KIND_LABEL[kind]) } })}
        </Typography>
        {!disabled && (
          <>
            <StepButton title={t('marketing.outreach.moveUp', { vars: { number } })} disabled={index === 0} onClick={() => onMove(index, index - 1)}>
              <ArrowUpwardIcon fontSize="small" />
            </StepButton>
            <StepButton title={t('marketing.outreach.moveDown', { vars: { number } })} disabled={index === count - 1} onClick={() => onMove(index, index + 1)}>
              <ArrowDownwardIcon fontSize="small" />
            </StepButton>
            <StepButton title={t('marketing.outreach.removeStep', { vars: { number } })} disabled={count === 1} onClick={() => onRemove(index)}>
              <DeleteOutlineIcon fontSize="small" />
            </StepButton>
          </>
        )}
      </Stack>
      <Stack spacing={2}>
        {kind === 'EMAIL' && <RhfTextField control={control} name={name('subject')} label={t('marketing.outreach.subject')} disabled={disabled} fullWidth />}
        {(kind === 'EMAIL' || kind === 'DM_TASK') && (
          <RhfTextField
            control={control}
            name={name('body')}
            label={t(kind === 'EMAIL' ? 'marketing.outreach.emailBody' : 'marketing.outreach.dmBody')}
            hint={t('marketing.outreach.bodyHint', { vars: { max: String(OUTREACH_LIMITS.body.max) } })}
            disabled={disabled}
            fullWidth
            multiline
            minRows={3}
          />
        )}
        {kind === 'WHATSAPP' && <WaTemplateField index={index} templates={templates} disabled={disabled} />}
        {kind === 'WAIT' && (
          <RhfTextField
            control={control}
            name={name('wait_days')}
            type="number"
            label={t('marketing.outreach.waitDays')}
            hint={t('marketing.outreach.waitDaysHint')}
            disabled={disabled}
            fullWidth
          />
        )}
        {(kind === 'EMAIL' || kind === 'DM_TASK') && !disabled && (
          <DraftStepButton index={index} kind={kind} sequenceId={sequenceId} savedKind={savedKind} />
        )}
      </Stack>
    </Paper>
  );
}
