import type { ReactNode } from 'react';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import { useTranslation, type Translate } from '../i18n/useTranslation';
import { searchMuiIconNames } from './muiIcons';
import { useMuiIcons } from './useMuiIcons';

/** Rows the list shows at once; a few letters narrow ~10.7k names to this. */
const MAX_OPTIONS = 120;

const ADORNMENT_SX = { display: 'flex', alignItems: 'center', pl: 1 } as const;

export interface MuiIconPickerProps {
  /** An MUI icon export name (`Pets`, `SportsSoccerOutlined`), or free text such as an emoji. */
  value: string;
  /** Called with every keystroke and with the icon picked; `''` when cleared. */
  onChange: (next: string) => void;
  label: string;
  /** Shown while the value is not an icon, and in place of everything else when `error` is set. */
  helperText?: string;
  error?: boolean;
  disabled?: boolean;
  onBlur?: () => void;
  /** Put on the `<input>` itself, where tests type. */
  testId?: string;
  /** The icon list could not be downloaded; log it with the host's logger. */
  onLoadError?: (error: unknown) => void;
}

function hintFor(
  t: Translate,
  props: Readonly<{ error: boolean; helperText?: string; selected: boolean; name: string; failed: boolean }>
) {
  if (props.error) return props.helperText;
  if (props.selected) return t('ui.iconPicker.selected', { vars: { name: props.name } });
  if (props.failed) return t('ui.iconPicker.loadFailed');
  return props.helperText;
}

function adornmentFor(Selected: SvgIconComponent | undefined, name: string): ReactNode {
  if (Selected) {
    return (
      <Box sx={ADORNMENT_SX}>
        <Selected fontSize="small" />
      </Box>
    );
  }
  // Text with no letters (an emoji, a symbol) is the icon itself, so it is shown;
  // a half-typed name is not drawn a second time beside the input.
  if (name && name.toLowerCase() === name.toUpperCase()) return <Box sx={ADORNMENT_SX}>{name}</Box>;
  return null;
}

/**
 * Pick any `@mui/icons-material` icon by searching the full list, each row
 * previewing its glyph. Free text is kept as typed (an emoji, a name the list
 * has not loaded yet), so the field works even while the list downloads or if
 * it cannot.
 */
export function MuiIconPicker({
  value,
  onChange,
  label,
  helperText,
  error = false,
  disabled = false,
  onBlur,
  testId,
  onLoadError,
}: Readonly<MuiIconPickerProps>) {
  const { t } = useTranslation();
  const { icons, names, find, loading, failed } = useMuiIcons(onLoadError);
  const name = value.trim();
  const Selected = find(name);

  return (
    <Autocomplete
      freeSolo
      forcePopupIcon
      openOnFocus
      autoHighlight
      disabled={disabled}
      options={names}
      loading={loading}
      loadingText={t('ui.iconPicker.loading')}
      filterOptions={(options, state) => searchMuiIconNames(options, state.inputValue, MAX_OPTIONS)}
      value={value}
      onChange={(_event, next) => onChange(next ?? '')}
      onInputChange={(_event, next, reason) => {
        if (reason === 'input') onChange(next);
      }}
      onBlur={onBlur}
      renderOption={({ key, ...optionProps }, option) => {
        const Icon = icons[option];
        return (
          <Box component="li" key={key} {...optionProps} sx={{ display: 'flex', gap: 1.25 }}>
            <Icon fontSize="small" />
            <Typography variant="body2">{option}</Typography>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={hintFor(t, { error, helperText, selected: !!Selected, name, failed })}
          slotProps={{
            ...params.slotProps,
            input: { ...params.slotProps.input, startAdornment: adornmentFor(Selected, name) },
            htmlInput: { ...params.slotProps.htmlInput, 'data-testid': testId },
          }}
        />
      )}
    />
  );
}
