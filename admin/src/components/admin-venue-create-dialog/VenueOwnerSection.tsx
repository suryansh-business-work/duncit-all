import { Box, TextField, Typography } from '@mui/material';
import DateField from '../DateField';
import type { Step3 } from './queries';

interface Props {
  s3: Step3;
  setS3: (next: Step3) => void;
}

export default function VenueOwnerSection({ s3, setS3 }: Props) {
  const set = (patch: Partial<Step3>) => setS3({ ...s3, ...patch });
  return (
    <>
      <Typography variant="subtitle2">Owner</Typography>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <TextField label="Owner name *" size="small" value={s3.owner_name} onChange={(e) => set({ owner_name: e.target.value })} />
        <TextField label="Owner email *" size="small" value={s3.owner_email} onChange={(e) => set({ owner_email: e.target.value })} />
        <TextField label="Owner phone *" size="small" value={s3.owner_phone} onChange={(e) => set({ owner_phone: e.target.value })} />
        <DateField
          label="DOB"
          size="small"
          value={s3.owner_dob}
          onChange={(iso) => set({ owner_dob: iso })}
          maxDate={new Date()}
        />
        <TextField sx={{ gridColumn: '1 / -1' }} label="Owner address" size="small" value={s3.owner_address} onChange={(e) => set({ owner_address: e.target.value })} />
      </Box>
    </>
  );
}
