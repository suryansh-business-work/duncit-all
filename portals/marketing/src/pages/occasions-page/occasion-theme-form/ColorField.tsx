import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { InputAdornment, TextField } from '@mui/material';
import { isHexColor } from '@duncit/regex';
import { useTranslation } from '@duncit/app-settings';
import ColorInput from './ColorInput';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
  /** What a blank means — the app's own value — shown greyed in the field and in the swatch. */
  placeholder?: string;
}

/**
 * A colour typed as hex or picked with the swatch beside it. A blank field
 * shows the colour it falls back to, so "keep the app's own" is visible too.
 */
export default function ColorField<T extends FieldValues>({ control, name, label, hint, placeholder }: Readonly<Props<T>>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, value, onChange, onBlur }, fieldState }) => {
        const text = String(value ?? '');
        const swatch = isHexColor(text.trim()) ? text : (placeholder ?? '');
        return (
          <TextField
            inputRef={ref}
            value={text}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            label={label}
            placeholder={placeholder}
            size="small"
            fullWidth
            error={!!fieldState.error}
            helperText={fieldState.error?.message ?? hint ?? ' '}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <ColorInput value={swatch} onChange={onChange} label={t('marketing.occasions.form.pickColor', { vars: { name: label } })} />
                  </InputAdornment>
                ),
              },
              htmlInput: { spellCheck: false, autoComplete: 'off' },
            }}
          />
        );
      }}
    />
  );
}
