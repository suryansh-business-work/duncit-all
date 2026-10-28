import type { Control } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { MANUAL_LIMITS } from '../../shared/vocabulary';
import type { CaseStepsValues } from './case-steps.types';

interface Props {
  control: Control<CaseStepsValues>;
  index: number;
  count: number;
  disabled: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

/** One step being edited: its action and expected outcome, moved up/down or removed by button. */
export function StepRow({ control, index, count, disabled, onMove, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const number = index + 1;
  return (
    <Stack component="li" direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: { md: 'flex-start' } }}>
      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: (theme) => theme.spacing(8), pt: { md: 2 } }}>
        {t('testsManual.steps.number', { vars: { number } })}
      </Typography>
      <RhfTextField
        control={control}
        name={`steps.${index}.action`}
        label={t('testsManual.steps.action')}
        required
        multiline
        minRows={1}
        disabled={disabled}
        slotProps={{ htmlInput: { maxLength: MANUAL_LIMITS.stepTextMax } }}
      />
      <RhfTextField
        control={control}
        name={`steps.${index}.expected`}
        label={t('testsManual.steps.expected')}
        multiline
        minRows={1}
        disabled={disabled}
        slotProps={{ htmlInput: { maxLength: MANUAL_LIMITS.stepTextMax } }}
      />
      <Stack direction="row" sx={{ pt: { md: 1 } }}>
        <DuncitIconButton
          aria-label={t('testsManual.steps.moveUp', { vars: { number } })}
          onClick={() => onMove(index, index - 1)}
          disabled={disabled || index === 0}
        >
          <ArrowUpwardIcon fontSize="small" />
        </DuncitIconButton>
        <DuncitIconButton
          aria-label={t('testsManual.steps.moveDown', { vars: { number } })}
          onClick={() => onMove(index, index + 1)}
          disabled={disabled || index === count - 1}
        >
          <ArrowDownwardIcon fontSize="small" />
        </DuncitIconButton>
        <DuncitIconButton
          aria-label={t('testsManual.steps.remove', { vars: { number } })}
          onClick={() => onRemove(index)}
          disabled={disabled}
        >
          <DeleteOutlineIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
    </Stack>
  );
}
