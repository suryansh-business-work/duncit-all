import { useId, useRef } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Box, FormHelperText, Stack, Tooltip, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { tokens } from '@duncit/theme';
import { useTranslation } from '@duncit/app-settings';
import ColorInput from './ColorInput';
import { LIMITS } from './occasion-theme.limits';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
  /** The colour a new entry starts as (the look's brand colour). */
  seed: string;
}

/**
 * A key per entry that survives a colour change: keyed by its colour, an open
 * native picker would be torn down on every drag. Entries are only ever
 * appended or removed here, so the keys follow them.
 */
function useEntryKeys(count: number) {
  const next = useRef(0);
  const keys = useRef<number[]>([]);
  while (keys.current.length < count) keys.current.push(next.current++);
  keys.current.length = count;
  return { keys: keys.current, drop: (at: number) => keys.current.splice(at, 1) };
}

interface ChipsProps {
  colors: string[];
  onChange: (colors: string[]) => void;
  seed: string;
}

function ColorChips({ colors, onChange, seed }: Readonly<ChipsProps>) {
  const { t } = useTranslation();
  const { keys, drop } = useEntryKeys(colors.length);
  const set = (at: number, hex: string) => onChange(colors.map((color, i) => (i === at ? hex : color)));
  const remove = (at: number) => {
    drop(at);
    onChange(colors.filter((_, i) => i !== at));
  };

  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
      {colors.map((color, i) => {
        const removeLabel = t('marketing.occasions.form.removeColorN', { vars: { n: i + 1 } });
        return (
          <Box
            key={keys[i]}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 0.5, py: 0.25, border: 1, borderColor: 'divider', borderRadius: 4 }}
          >
            <ColorInput value={color} onChange={(hex) => set(i, hex)} label={t('marketing.occasions.form.colorN', { vars: { n: i + 1 } })} />
            <Typography variant="caption" sx={{ fontFamily: tokens.font.mono }}>
              {color}
            </Typography>
            <Tooltip title={removeLabel}>
              <DuncitIconButton size="small" aria-label={removeLabel} onClick={() => remove(i)}>
                <CloseRoundedIcon fontSize="small" />
              </DuncitIconButton>
            </Tooltip>
          </Box>
        );
      })}
      <DuncitButton
        size="small"
        startIcon={<AddRoundedIcon />}
        disabled={colors.length >= LIMITS.colors}
        onClick={() => onChange([...colors, colors.at(-1) ?? seed])}
      >
        {t('marketing.occasions.form.addColor')}
      </DuncitButton>
    </Stack>
  );
}

/** Up to eight colours, each picked with the browser's colour picker and shown as its hex. */
export default function ColorListField<T extends FieldValues>({ control, name, label, hint, seed }: Readonly<Props<T>>) {
  const labelId = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState }) => {
        const message = fieldState.error?.message ?? fieldState.error?.root?.message;
        return (
          <Stack spacing={0.75} role="group" aria-labelledby={labelId}>
            <Typography id={labelId} variant="body2" sx={{ fontWeight: 600 }}>
              {label}
            </Typography>
            <ColorChips colors={Array.isArray(value) ? value.map(String) : []} onChange={onChange} seed={seed} />
            {(message ?? hint) && <FormHelperText error={!!message}>{message ?? hint}</FormHelperText>}
          </Stack>
        );
      }}
    />
  );
}
