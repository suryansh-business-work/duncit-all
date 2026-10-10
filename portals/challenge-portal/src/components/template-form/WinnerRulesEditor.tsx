import { Controller, useFieldArray, type Control } from 'react-hook-form';
import { IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { MAX_TIE_BREAKERS, TOTAL_KEY, type TemplateFormValues } from './template.types';

export interface RankOption {
  value: string;
  label: string;
}

interface Props {
  control: Control<TemplateFormValues>;
  /** TOTAL plus every scoring tool instance currently in the template. */
  options: RankOption[];
  error?: string;
  disabled: boolean;
}

function KeyFields({ control, base, options, disabled }: Readonly<{
  control: Control<TemplateFormValues>;
  base: 'winner_rules' | `winner_rules.tie_breakers.${number}`;
  options: RankOption[];
  disabled: boolean;
}>) {
  const { t } = useTranslation();
  return (
    <>
      <Controller
        name={`${base}.rank_by`}
        control={control}
        render={({ field }) => (
          <TextField select size="small" label={t('challenge.templates.fields.rankBy')} {...field} disabled={disabled} sx={{ flex: 2 }}>
            {options.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Controller
        name={`${base}.direction`}
        control={control}
        render={({ field }) => (
          <TextField select size="small" label={t('challenge.templates.fields.direction')} {...field} disabled={disabled} sx={{ flex: 1 }}>
            <MenuItem value="DESC">{t('challenge.templates.highestWins')}</MenuItem>
            <MenuItem value="ASC">{t('challenge.templates.lowestWins')}</MenuItem>
          </TextField>
        )}
      />
    </>
  );
}

/** How the winner is decided: a primary ranking key, up to three tie-breakers, podium size. */
export function WinnerRulesEditor({ control, options, error, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const breakers = useFieldArray({ control, name: 'winner_rules.tie_breakers' });

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" component="h3">
        {t('challenge.templates.winnerRules')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <KeyFields control={control} base="winner_rules" options={options} disabled={disabled} />
      </Stack>
      {breakers.fields.map((f, i) => (
        <Stack key={f.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
          <KeyFields control={control} base={`winner_rules.tie_breakers.${i}`} options={options} disabled={disabled} />
          <Tooltip title={t('challenge.templates.removeTieBreaker')}>
            <span>
              <IconButton aria-label={t('challenge.templates.removeTieBreaker')} onClick={() => breakers.remove(i)} disabled={disabled}>
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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
        <DuncitButton
          size="small"
          startIcon={<AddIcon />}
          onClick={() => breakers.append({ rank_by: TOTAL_KEY, direction: 'DESC' })}
          disabled={disabled || breakers.fields.length >= MAX_TIE_BREAKERS}
        >
          {t('challenge.templates.addTieBreaker')}
        </DuncitButton>
        <Controller
          name="winner_rules.podium_size"
          control={control}
          render={({ field }) => (
            <TextField
              type="number"
              size="small"
              label={t('challenge.templates.fields.podium')}
              value={field.value}
              onChange={(e) => field.onChange(Number(e.target.value))}
              slotProps={{ htmlInput: { min: 1, max: 10, step: 1 } }}
              disabled={disabled}
              sx={{ width: 160 }}
            />
          )}
        />
      </Stack>
    </Stack>
  );
}
