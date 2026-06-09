import { useMemo, useState } from 'react';
import { Stack, TextField } from '@mui/material';
import DateField from '../../components/DateField';
import type { VenueStep3 } from './types';
import { getStepErrors, venueStep3Schema } from './register-venue.form';

interface Props {
  value: VenueStep3;
  onChange: (next: VenueStep3) => void;
  showAllErrors?: boolean;
  accountEmail?: string;
}

export default function OwnerStep({ value, onChange, showAllErrors, accountEmail }: Readonly<Props>) {
  const [touched, setTouched] = useState<Partial<Record<keyof VenueStep3, boolean>>>({});
  const errors = useMemo(() => getStepErrors(venueStep3Schema, value), [value]);
  const set = (patch: Partial<VenueStep3>) => onChange({ ...value, ...patch });
  const showError = (key: keyof VenueStep3) => {
    if (!errors[key]) return false;
    const hasValue = String(value[key] ?? '').length > 0;
    return Boolean(showAllErrors || touched[key] || hasValue);
  };
  const touch = (key: keyof VenueStep3) => setTouched((prev) => ({ ...prev, [key]: true }));

  return (
    <Stack spacing={2.5}>
      <TextField
        label="Owner name"
        required
        value={value.owner_name}
        onChange={(e) => set({ owner_name: e.target.value })}
        onBlur={() => touch('owner_name')}
        error={showError('owner_name')}
        helperText={showError('owner_name') ? errors.owner_name : ' '}
      />
      <TextField
        label="Owner email"
        type="email"
        required
        value={value.owner_email}
        disabled
        InputProps={{ readOnly: true }}
        onBlur={() => touch('owner_email')}
        error={showError('owner_email')}
        helperText={showError('owner_email') ? errors.owner_email : accountEmail ? 'Locked to your Duncit account' : 'Loaded from your Duncit account'}
      />
      <TextField
        label="Owner phone"
        required
        value={value.owner_phone}
        onChange={(e) => set({ owner_phone: e.target.value })}
        onBlur={() => touch('owner_phone')}
        error={showError('owner_phone')}
        helperText={showError('owner_phone') ? errors.owner_phone : ' '}
      />
      <DateField
        label="Owner DOB"
        value={value.owner_dob}
        onChange={(iso) => set({ owner_dob: iso })}
        onBlur={() => touch('owner_dob')}
        error={showError('owner_dob')}
        helperText={showError('owner_dob') ? errors.owner_dob : ' '}
        maxDate={new Date()}
      />
      <TextField
        label="Owner address"
        multiline
        minRows={2}
        value={value.owner_address}
        onChange={(e) => set({ owner_address: e.target.value })}
        onBlur={() => touch('owner_address')}
        error={showError('owner_address')}
        helperText={showError('owner_address') ? errors.owner_address : ' '}
      />
    </Stack>
  );
}
