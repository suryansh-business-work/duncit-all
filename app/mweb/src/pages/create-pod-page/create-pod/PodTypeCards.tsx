import { useEffect, type ReactNode } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import { Alert, Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useTranslation } from '../../../i18n/useTranslation';
import { isFreePodType, offersFreeVenue, type CreatePodForm, type CreatePodFormValues } from './create-pod.types';

const DIRTY = { shouldDirty: true, shouldValidate: true } as const;

/** The pod turned free: ₹0, and no Smart Incentive — a free pod has no ticket price to discount. */
function makeFree(setValue: UseFormSetValue<CreatePodFormValues>) {
  setValue('pod_type', 'FREE', DIRTY);
  setValue('pod_amount', 0, DIRTY);
  setValue('smart_incentive_enabled', false, DIRTY);
  setValue('smart_incentive_pct', '', DIRTY);
}

interface CardProps {
  testId: string;
  label: string;
  caption: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
}

/** A selection tile: green with white ink when picked, the soft fill when not
 * (native twin: TypeCard in PodTypeCards). */
function TypeCard({ testId, label, caption, icon, selected, onClick }: Readonly<CardProps>) {
  const ink = selected ? 'primary.contrastText' : 'text.primary';
  return (
    <Card
      data-testid={testId}
      sx={{
        borderRadius: '16px',
        boxShadow: 'none',
        border: 0,
        bgcolor: selected ? 'primary.main' : 'action.hover',
        color: ink,
      }}
    >
      <CardActionArea onClick={onClick} aria-label={label} aria-pressed={selected} sx={{ p: 2, display: 'grid', placeItems: 'center', gap: 0.5, textAlign: 'center', borderRadius: '16px' }}>
        <Box sx={{ display: 'grid', placeItems: 'center' }}>{icon}</Box>
        <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: ink }}>{label}</Typography>
        <Typography variant="caption" sx={{ color: selected ? 'primary.contrastText' : 'text.secondary' }}>
          {caption}
        </Typography>
      </CardActionArea>
    </Card>
  );
}

/** Free / Paid selector cards for Step 4 — the only two pod types, both open
 * to a physical and a virtual pod. A pod asking its venue for the window free
 * is free too: Paid goes, and Free is picked for the host (the server refuses
 * a free venue for a paid pod). Native twin (rule 27). */
export default function PodTypeCards({ form }: Readonly<{ form: CreatePodForm }>) {
  const { watch, setValue } = form;
  const { t } = useTranslation();
  const isFree = isFreePodType(watch('pod_type'));
  const freeVenue = offersFreeVenue({
    pod_type: watch('pod_type'),
    pod_mode: watch('pod_mode'),
    venue_slot_id: watch('venue_slot_id'),
    partner_request_id: watch('partner_request_id'),
    venue_offer_model: watch('venue_offer_model'),
  });

  useEffect(() => {
    if (freeVenue && !isFree) makeFree(setValue);
  }, [freeVenue, isFree, setValue]);

  const choose = (free: boolean) => {
    if (free === isFree) return;
    if (free) {
      makeFree(setValue);
    } else {
      setValue('pod_type', 'PAID', DIRTY);
      // The ₹0 a Free pod forces was never typed by the host — a paid pod goes
      // back to a blank price field.
      setValue('pod_amount', null, DIRTY);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Box data-testid="create-pod-pod-type-cards" sx={{ display: 'grid', gridTemplateColumns: freeVenue ? '1fr' : '1fr 1fr', gap: 1.5 }}>
        <TypeCard testId="create-pod-free" label={t('mweb.createPod.podTypeFree')} caption={t('mweb.createPod.freeCaption')} icon={<VolunteerActivismIcon />} selected={isFree} onClick={() => choose(true)} />
        {!freeVenue && (
          <TypeCard testId="create-pod-paid" label={t('mweb.createPod.podTypePaid')} caption={t('mweb.createPod.paidCaption')} icon={<PaymentsIcon />} selected={!isFree} onClick={() => choose(false)} />
        )}
      </Box>
      {freeVenue && (
        <Alert severity="info" role="status" data-testid="create-pod-free-venue-ticket">
          {t('mweb.createPod.freeVenueTicket')}
        </Alert>
      )}
    </Stack>
  );
}
