import { type ReactNode } from 'react';
import { Box, Card, CardActionArea, Typography } from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useTranslation } from '../../../i18n/useTranslation';
import { isFreePodType, type CreatePodForm } from './create-pod.types';

interface CardProps {
  label: string;
  caption: string;
  icon: ReactNode;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/** A selection tile: green with white ink when picked, the soft fill when not
 * (native twin: TypeCard in PodTypeCards). */
function TypeCard({ label, caption, icon, selected, disabled, onClick }: Readonly<CardProps>) {
  const ink = selected ? 'primary.contrastText' : 'text.primary';
  return (
    <Card
      sx={{
        borderRadius: '16px',
        boxShadow: 'none',
        border: 0,
        bgcolor: selected ? 'primary.main' : 'action.hover',
        color: ink,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <CardActionArea onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={selected} sx={{ p: 2, display: 'grid', placeItems: 'center', gap: 0.5, textAlign: 'center', borderRadius: '16px' }}>
        <Box sx={{ display: 'grid', placeItems: 'center' }}>{icon}</Box>
        <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: ink }}>{label}</Typography>
        <Typography variant="caption" sx={{ color: selected ? 'primary.contrastText' : 'text.secondary' }}>
          {caption}
        </Typography>
      </CardActionArea>
    </Card>
  );
}

/** Free / Paid selector cards for Step 4 — the only two pod types. Physical
 * pods can only be Paid, so the Free card is disabled for them. */
export default function PodTypeCards({ form }: Readonly<{ form: CreatePodForm }>) {
  const { watch, setValue } = form;
  const { t } = useTranslation();
  const isFree = isFreePodType(watch('pod_type'));
  const isPhysical = watch('pod_mode') === 'PHYSICAL';
  const freeCaption = isPhysical
    ? t('mweb.createPod.physicalPaidCaption')
    : t('mweb.createPod.freeCaption');

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
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
      <TypeCard label={t('mweb.createPod.podTypeFree')} caption={freeCaption} icon={<VolunteerActivismIcon />} selected={isFree} disabled={isPhysical} onClick={() => choose(true)} />
      <TypeCard label={t('mweb.createPod.podTypePaid')} caption={t('mweb.createPod.paidCaption')} icon={<PaymentsIcon />} selected={!isFree} onClick={() => choose(false)} />
    </Box>
  );
}
