import { type ReactNode } from 'react';
import { Box, Card, CardActionArea, Typography } from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import PaymentsIcon from '@mui/icons-material/Payments';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { isFreePodType, type CreatePodForm } from './create-pod.types';

interface CardProps {
  label: string;
  caption: string;
  icon: ReactNode;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function TypeCard({ label, caption, icon, selected, disabled, onClick }: Readonly<CardProps>) {
  return (
    <Card variant="outlined" sx={{ borderColor: selected ? 'primary.main' : 'divider', borderWidth: selected ? 2 : 1, position: 'relative', opacity: disabled ? 0.5 : 1 }}>
      <CardActionArea onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={selected} sx={{ p: 2, display: 'grid', placeItems: 'center', gap: 0.5, textAlign: 'center' }}>
        {selected && <CheckCircleIcon color="primary" fontSize="small" sx={{ position: 'absolute', top: 8, right: 8 }} />}
        <Box sx={{ color: selected ? 'primary.main' : 'text.secondary', display: 'grid', placeItems: 'center' }}>{icon}</Box>
        <Typography variant="subtitle1" fontWeight={900} color={selected ? 'primary.main' : 'text.primary'}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">{caption}</Typography>
      </CardActionArea>
    </Card>
  );
}

/** Free / Paid selector cards for Step 4 — the only two pod types. Physical
 * pods can only be Paid, so the Free card is disabled for them. */
export default function PodTypeCards({ form }: Readonly<{ form: CreatePodForm }>) {
  const { watch, setValue } = form;
  const isFree = isFreePodType(watch('pod_type'));
  const isPhysical = watch('pod_mode') === 'PHYSICAL';
  // TODO(i18n) — captions below
  const freeCaption = isPhysical ? 'Physical pods are always paid' : 'No ticket charge';

  const choose = (free: boolean) => {
    if (free === isFree) return;
    if (free) {
      setValue('pod_type', 'FREE', { shouldDirty: true, shouldValidate: true });
      setValue('pod_amount', 0, { shouldDirty: true, shouldValidate: true });
    } else {
      setValue('pod_type', 'PAID', { shouldDirty: true, shouldValidate: true });
      // The ₹0 a Free pod forces was never typed by the host — a paid pod goes
      // back to a blank price field.
      setValue('pod_amount', null, { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
      <TypeCard label="Free" caption={freeCaption} icon={<VolunteerActivismIcon />} selected={isFree} disabled={isPhysical} onClick={() => choose(true)} />
      <TypeCard label="Paid" caption="Charge per person" icon={<PaymentsIcon />} selected={!isFree} onClick={() => choose(false)} />
    </Box>
  );
}
