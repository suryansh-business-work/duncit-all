import { useMemo } from 'react';
import { Autocomplete, Stack, TextField, Typography } from '@mui/material';
import { describeLocale, localeOptions, type LocaleOption } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

interface Props {
  /** The tag currently on the form — this input is fully controlled by it. */
  value: string;
  error?: string;
  /** A picked row, or a tag typed by hand — described the same way either way. */
  onPick: (option: LocaleOption) => void;
}

/**
 * The language a locale row is for, chosen from the ISO catalogue.
 *
 * This used to be a bare text field asking for a BCP-47 tag and, beside it, the
 * language's name typed in its own script — which is why every environment had
 * exactly one locale in it and auto-translation had nothing to translate into.
 * Picking a row here fills the tag, both names and the writing direction.
 *
 * The options are TAGS, not objects: `freeSolo` lets the field hold a typed
 * value, and one type through `value`/`inputValue`/`options` is what keeps that
 * from becoming a union the component has to unpick at every callback.
 *
 * Typed input stays allowed on purpose — the shipped list is every ISO 639-1
 * language plus a shortlist of region tags, and an operator who needs `es-CO`
 * should not have to wait for a release.
 */
export default function LocalePicker({ value, error, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  // ~250 rows, each asking ICU for two display names — built once.
  const options = useMemo(() => localeOptions(), []);
  const byCode = useMemo(
    () => new Map(options.map((option) => [option.code, option])),
    [options],
  );
  const codes = useMemo(() => options.map((option) => option.code), [options]);

  return (
    <Autocomplete
      freeSolo
      autoHighlight
      options={codes}
      value={value}
      inputValue={value}
      onChange={(_, picked) => onPick(describeLocale(picked ?? ''))}
      onInputChange={(_, typed) => onPick(describeLocale(typed))}
      filterOptions={(list, state) => {
        const query = state.inputValue.trim().toLowerCase();
        if (!query) return list;
        return list.filter((code) => {
          const option = byCode.get(code);
          return (
            code.toLowerCase().includes(query) ||
            !!option?.english_label.toLowerCase().includes(query) ||
            !!option?.label.toLowerCase().includes(query)
          );
        });
      }}
      renderOption={(props, code) => {
        const { key, ...rest } = props as typeof props & { key: string };
        const option = byCode.get(code);
        return (
          <li key={key} {...rest}>
            <Stack>
              <Typography variant="body2">{option?.label ?? code}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {option?.english_label ?? code} · {code}
              </Typography>
            </Stack>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={t('admin.localization.localeCode')}
          placeholder="hi-IN"
          error={!!error}
          helperText={error ?? t('admin.localization.localePickerHint')}
          fullWidth
        />
      )}
    />
  );
}
