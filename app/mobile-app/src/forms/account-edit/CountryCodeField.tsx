import { AppImage } from '@/components/AppImage';

import { useController, type Control, type Path } from 'react-hook-form';

import { countryFlagUrl } from '@/utils/location-tree';
import { SelectSheet, type SelectOption } from './SelectSheet';
import { COUNTRY_CODES, countryByDial } from './country-codes';
import type { AccountEditValues } from './account-edit.types';

interface Props {
  control: Control<AccountEditValues>;
  name: Path<AccountEditValues>;
  label: string;
  testID: string;
  disabled?: boolean;
}

/** Options carry the dial as `value` so the form stores the dial string. */
const OPTIONS: SelectOption[] = COUNTRY_CODES.map((c) => ({
  value: c.dial,
  label: c.name,
  flag: countryFlagUrl(c.iso2),
  hint: c.dial,
}));

/**
 * Searchable country-dial-code dropdown (bug 4) bound to react-hook-form. The
 * field stores the dial string (e.g. '+91'); the sheet can be searched by country
 * name or code. RN twin of mWeb's MUI CountryCodeField.
 */
export function CountryCodeField({ control, name, label, testID, disabled }: Readonly<Props>) {
  const { field, fieldState } = useController({ control, name });
  const dial = String(field.value ?? '');
  const match = countryByDial(dial);
  const flag = match ? countryFlagUrl(match.iso2) : '';

  return (
    <SelectSheet
      testID={testID}
      label={label}
      value={dial}
      placeholder="Code"
      options={OPTIONS}
      disabled={disabled}
      error={fieldState.error?.message}
      leading={
        flag ? (
          <AppImage source={{ uri: flag }} style={{ width: 22, height: 16, borderRadius: 2 }} />
        ) : undefined
      }
      onPick={field.onChange}
    />
  );
}
