import { Stack, TextField } from '@mui/material';
import type { VenueStep3 } from './types';

interface Props {
  value: VenueStep3;
  onChange: (next: VenueStep3) => void;
}

export default function OwnerStep({ value, onChange }: Props) {
  const set = (patch: Partial<VenueStep3>) => onChange({ ...value, ...patch });

  return (
    <Stack spacing={2}>
      <TextField label="Owner name" required value={value.owner_name} onChange={(e) => set({ owner_name: e.target.value })} />
      <TextField label="Owner email" type="email" required value={value.owner_email} onChange={(e) => set({ owner_email: e.target.value })} />
      <TextField label="Owner phone" required value={value.owner_phone} onChange={(e) => set({ owner_phone: e.target.value })} />
      <TextField label="Owner DOB" type="date" InputLabelProps={{ shrink: true }} value={value.owner_dob} onChange={(e) => set({ owner_dob: e.target.value })} />
      <TextField label="Owner address" multiline minRows={2} value={value.owner_address} onChange={(e) => set({ owner_address: e.target.value })} />
    </Stack>
  );
}