import { InputAdornment, MenuItem, TextField } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { useTranslation } from './i18n/useTranslation';

export interface LanguageOption {
  code: string;
  label: string;
  english_label?: string | null;
}

export interface LanguageSelectProps {
  value: string;
  options: readonly LanguageOption[];
  onChange: (code: string) => void;
  /** Defaults to the shared `Language` copy in the reader's language. */
  label?: string;
  helperText?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  /** Render even with one language configured — the taskbar's clock tray always
   *  shows a Language row, the way a desktop's does. */
  showSingle?: boolean;
}

/**
 * The language switcher used by mWeb and every portal's profile section.
 *
 * Each option shows the language in its OWN script (the endonym) with the
 * English name beside it, so someone who has accidentally switched to a script
 * they cannot read can still find their way back.
 *
 * Renders nothing when the platform offers fewer than two languages — a
 * one-option switcher is noise. `showSingle` is for the one place that is not
 * true: a tray whose whole purpose is to say what the console is set to.
 */
export function LanguageSelect({
  value,
  options,
  onChange,
  label,
  helperText,
  disabled = false,
  size = 'small',
  fullWidth = true,
  showSingle = false,
}: Readonly<LanguageSelectProps>) {
  const { t } = useTranslation();
  if (options.length < (showSingle ? 1 : 2)) return null;

  return (
    <TextField
      select
      label={label ?? t('ui.language.label')}
      value={options.some((o) => o.code === value) ? value : options[0].code}
      onChange={(event) => onChange(event.target.value)}
      helperText={helperText}
      disabled={disabled}
      size={size}
      fullWidth={fullWidth}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <TranslateIcon fontSize="small" />
            </InputAdornment>
          ),
        }
      }}
    >
      {options.map((option) => (
        <MenuItem key={option.code} value={option.code}>
          {option.label}
          {option.english_label ? ` · ${option.english_label}` : ''}
        </MenuItem>
      ))}
    </TextField>
  );
}
