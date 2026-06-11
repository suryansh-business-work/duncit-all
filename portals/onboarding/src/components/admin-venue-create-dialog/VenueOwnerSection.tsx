import { Box, TextField } from '@mui/material';
import DateField from '../DateField';
import type { Step3 } from './queries';
import { getVenueError, type VenueValidationErrors } from './venue.form';

interface Props {
  s3: Step3;
  setS3: (next: Step3) => void;
  errors?: VenueValidationErrors;
}

export default function VenueOwnerSection({ s3, setS3, errors }: Readonly<Props>) {
  const set = (patch: Partial<Step3>) => setS3({ ...s3, ...patch });
  const err = (field: keyof Step3) => getVenueError(errors, `step3.${field}`);
  return (
    <Box sx={{ display: 'grid', columnGap: 1.5, rowGap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <TextField label="Owner name *" size="small" value={s3.owner_name} onChange={(e) => set({ owner_name: e.target.value })} error={!!err('owner_name')} helperText={err('owner_name') || undefined} />
        <TextField label="Owner email *" size="small" value={s3.owner_email} onChange={(e) => set({ owner_email: e.target.value })} error={!!err('owner_email')} helperText={err('owner_email') || undefined} />
        <TextField label="Owner phone *" size="small" value={s3.owner_phone} onChange={(e) => set({ owner_phone: e.target.value })} error={!!err('owner_phone')} helperText={err('owner_phone') || undefined} />
        <DateField
          label="DOB"
          size="small"
          value={s3.owner_dob}
          onChange={(iso) => set({ owner_dob: iso })}
          error={!!err('owner_dob')}
          helperText={err('owner_dob') || undefined}
          maxDate={new Date()}
        />
        <TextField sx={{ gridColumn: '1 / -1' }} label="Owner address" size="small" value={s3.owner_address} onChange={(e) => set({ owner_address: e.target.value })} error={!!err('owner_address')} helperText={err('owner_address') || undefined} />
      </Box>
  );
}
