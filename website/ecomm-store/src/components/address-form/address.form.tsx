import type { Control, FieldValues, Path } from 'react-hook-form';
import { Box } from '@mui/material';
import { RhfTextField } from '@duncit/forms';

import { useStoreT } from '../../i18n';
import type { AddressValues } from './address.types';

interface AddressFieldsProps<T extends FieldValues> {
  /** A form whose values include every AddressValues field. */
  control: Control<T>;
}

type FieldSpec = {
  name: keyof AddressValues;
  labelKey: string;
  autoComplete: string;
  wide?: boolean;
  numeric?: boolean;
};

const FIELDS: FieldSpec[] = [
  { name: 'name', labelKey: 'ecommStore.address.name', autoComplete: 'name' },
  { name: 'phone', labelKey: 'ecommStore.address.phone', autoComplete: 'tel-national', numeric: true },
  { name: 'line1', labelKey: 'ecommStore.address.line1', autoComplete: 'address-line1', wide: true },
  { name: 'line2', labelKey: 'ecommStore.address.line2', autoComplete: 'address-line2', wide: true },
  { name: 'landmark', labelKey: 'ecommStore.address.landmark', autoComplete: 'off' },
  { name: 'pincode', labelKey: 'ecommStore.address.pincode', autoComplete: 'postal-code', numeric: true },
  { name: 'city', labelKey: 'ecommStore.address.city', autoComplete: 'address-level2' },
  { name: 'state', labelKey: 'ecommStore.address.state', autoComplete: 'address-level1' },
];

/**
 * The address inputs, for any form that carries the address fields — checkout,
 * the address book and Autoship all render these same eight boxes.
 */
export function AddressFields<T extends FieldValues>({ control }: Readonly<AddressFieldsProps<T>>) {
  const { t } = useStoreT();
  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      {FIELDS.map((field) => (
        <Box key={field.name} sx={{ gridColumn: field.wide ? '1 / -1' : 'auto' }}>
          <RhfTextField
            control={control}
            name={field.name as Path<T>}
            label={t(field.labelKey)}
            autoComplete={field.autoComplete}
            required={field.name !== 'line2' && field.name !== 'landmark'}
            slotProps={field.numeric ? { htmlInput: { inputMode: 'numeric' } } : undefined}
          />
        </Box>
      ))}
    </Box>
  );
}
