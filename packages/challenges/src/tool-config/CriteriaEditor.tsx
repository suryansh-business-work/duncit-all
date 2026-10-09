import { IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n';
import type { JudgeCriterion } from './fields';

interface Props {
  value: JudgeCriterion[];
  onChange: (next: JudgeCriterion[]) => void;
  disabled?: boolean;
  error?: string;
}

const MAX_CRITERIA = 10;

/** Judging criteria: a label, its weight in the judge's total, and its top mark. */
export function CriteriaEditor({ value, onChange, disabled, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const update = (i: number, patch: Partial<JudgeCriterion>) =>
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const add = () => onChange([...value, { key: `c${Date.now().toString(36)}`, label: '', weight: 1, max: 10 }]);

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" component="p">
        {t('challenge.toolConfig.fields.criteria')}
      </Typography>
      {value.map((c, i) => (
        <Stack key={c.key} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
          <TextField
            size="small"
            label={t('challenge.toolConfig.criterion.label')}
            value={c.label}
            onChange={(e) => update(i, { label: e.target.value })}
            disabled={disabled}
            sx={{ flex: 2 }}
          />
          <TextField
            size="small"
            type="number"
            label={t('challenge.toolConfig.criterion.weight')}
            value={c.weight}
            onChange={(e) => update(i, { weight: Number(e.target.value) })}
            disabled={disabled}
            slotProps={{ htmlInput: { min: 0.1, step: 0.1 } }}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            type="number"
            label={t('challenge.toolConfig.criterion.max')}
            value={c.max}
            onChange={(e) => update(i, { max: Number(e.target.value) })}
            disabled={disabled}
            slotProps={{ htmlInput: { min: 1, max: 100, step: 1 } }}
            sx={{ flex: 1 }}
          />
          <Tooltip title={t('challenge.toolConfig.criterion.remove')}>
            <span>
              <IconButton
                aria-label={t('challenge.toolConfig.criterion.remove')}
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                disabled={disabled || value.length <= 1}
              >
                <DeleteOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ))}
      {error && (
        <Typography variant="caption" color="error" role="alert">
          {error}
        </Typography>
      )}
      <DuncitButton
        size="small"
        startIcon={<AddIcon />}
        onClick={add}
        disabled={disabled || value.length >= MAX_CRITERIA}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('challenge.toolConfig.criterion.add')}
      </DuncitButton>
    </Stack>
  );
}
