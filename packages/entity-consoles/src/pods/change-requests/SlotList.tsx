import { Alert, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { PodChangeSlotRow } from '@duncit/pod-change-requests';

interface Props {
  rows: readonly PodChangeSlotRow[];
  loading: boolean;
  busy: boolean;
  onPick: (slot: PodChangeSlotRow) => void;
}

/**
 * The free slots at the venue an admin just picked.
 *
 * Nothing here is reserved. The chosen slot is only checked (real, free, in the
 * future) when the offer is sent, and booked when the venue approves — see
 * `assertOfferableSlot`. Price and capacity are shown because they decide
 * whether the pod still works at this venue: the slot's price is what the pod's
 * settlement has to cover.
 */
export default function SlotList({ rows, loading, busy, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();

  if (loading) {
    return (
      <Stack spacing={1}>
        <Skeleton variant="rounded" height={64} />
        <Skeleton variant="rounded" height={64} />
      </Stack>
    );
  }

  if (rows.length === 0) {
    return <Alert severity="warning">{t('admin.changeRequests.noSlots')}</Alert>;
  }

  return (
    <Stack spacing={1}>
      {rows.map((slot) => (
        <Card key={slot.id} variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ py: 1.25 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Stack sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {formatDateTime(slot.start_at)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {[
                    slot.space_label,
                    `${t('admin.changeRequests.colPrice')}: ${slot.price}`,
                    `${t('admin.changeRequests.colCapacity')}: ${slot.capacity}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Typography>
              </Stack>
              <DuncitButton
                variant="contained"
                size="small"
                disabled={busy}
                onClick={() => onPick(slot)}
                sx={{ flexShrink: 0 }}
              >
                {t('admin.changeRequests.sendRequest')}
              </DuncitButton>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
