import { useMemo } from 'react';
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { AdminLocationSelect, buildLocationValueFromNames, useAdminLocations } from '@duncit/location';
import type { AccountEditValues } from './account-edit.types';

interface Props {
  control: Control<AccountEditValues>;
  setValue: UseFormSetValue<AccountEditValues>;
}

/**
 * Dependent Country → State → City dropdowns, sourced strictly from the admin
 * Location DB via the shared @duncit/location picker. The profile stores the
 * country/state/city names, so we hydrate the picker from those names and write
 * the names back on change.
 */
export default function LocationSelect({ control, setValue }: Readonly<Props>) {
  const country = useWatch({ control, name: 'country' }) as string;
  const state = useWatch({ control, name: 'state' }) as string;
  const city = useWatch({ control, name: 'city' }) as string;
  const { locations } = useAdminLocations();

  const value = useMemo(
    () => buildLocationValueFromNames(locations, { country, state, city }),
    [locations, country, state, city],
  );

  const write = (field: 'country' | 'state' | 'city', next: string) =>
    setValue(field, next, { shouldDirty: true, shouldValidate: true });

  return (
    <AdminLocationSelect
      value={value}
      onChange={(next) => {
        write('country', next.country);
        write('state', next.state);
        write('city', next.city);
      }}
      fields={['country', 'state', 'city']}
      required
      legend="Location"
      hint="Your city — used to surface pods and clubs near you."
    />
  );
}
