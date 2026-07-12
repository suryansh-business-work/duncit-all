import { type ReactNode } from 'react';
import { Box, Card, CardActionArea, MenuItem, TextField, Typography } from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import PaymentsIcon from '@mui/icons-material/Payments';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { POD_TYPES, type CreatePodForm } from './create-pod.types';

interface CardProps {
  label: string;
  caption: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
}

function TypeCard({ label, caption, icon, selected, onClick }: Readonly<CardProps>) {
  return (
    <Card variant="outlined" sx={{ borderColor: selected ? 'primary.main' : 'divider', borderWidth: selected ? 2 : 1, position: 'relative' }}>
      <CardActionArea onClick={onClick} aria-label={label} aria-pressed={selected} sx={{ p: 2, display: 'grid', placeItems: 'center', gap: 0.5, textAlign: 'center' }}>
        {selected && <CheckCircleIcon color="primary" fontSize="small" sx={{ position: 'absolute', top: 8, right: 8 }} />}
        <Box sx={{ color: selected ? 'primary.main' : 'text.secondary', display: 'grid', placeItems: 'center' }}>{icon}</Box>
        <Typography variant="subtitle1" fontWeight={900} color={selected ? 'primary.main' : 'text.primary'}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">{caption}</Typography>
      </CardActionArea>
    </Card>
  );
}

/** Free / Paid selector cards for Step 4. The cards set the free/paid family and
 * a refine dropdown keeps the exact pod type (native / non-native / premium). */
export default function PodTypeCards({ form }: Readonly<{ form: CreatePodForm }>) {
  const { watch, setValue } = form;
  const podType = watch('pod_type');
  const isFree = podType.includes('FREE');
  const freeTypes = POD_TYPES.filter((type) => type.value.includes('FREE'));
  const paidTypes = POD_TYPES.filter((type) => !type.value.includes('FREE'));

  const choose = (free: boolean) => {
    if (free === isFree) return;
    if (free) {
      setValue('pod_type', freeTypes[0].value, { shouldDirty: true });
      setValue('pod_amount', 0, { shouldDirty: true, shouldValidate: true });
    } else {
      setValue('pod_type', paidTypes[0].value, { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
        <TypeCard label="Free" caption="No ticket charge" icon={<VolunteerActivismIcon />} selected={isFree} onClick={() => choose(true)} />
        <TypeCard label="Paid" caption="Charge per person" icon={<PaymentsIcon />} selected={!isFree} onClick={() => choose(false)} />
      </Box>
      <TextField
        select
        label="Pod type"
        fullWidth
        sx={{ mt: 1.5 }}
        value={podType}
        onChange={(e) => {
          const next = e.target.value;
          setValue('pod_type', next, { shouldDirty: true, shouldValidate: true });
          // Refining to a FREE variant zeroes the ticket price (native parity) —
          // otherwise the disabled amount field retains a stale paid price and
          // the earnings preview keeps computing a collection for a free pod.
          if (next.includes('FREE')) {
            setValue('pod_amount', 0, { shouldDirty: true, shouldValidate: true });
          }
        }}
      >
        {POD_TYPES.map((type) => (
          <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
        ))}
      </TextField>
    </Box>
  );
}
