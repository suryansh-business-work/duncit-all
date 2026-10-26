import { useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import type { VenueChatSide } from '@duncit/utils';
import CounterOfferDialog from '../CounterOfferDialog';
import type { PodOffer } from '../host/queries';
import type { OfferTarget } from '../offer-target';
import { WITHDRAW_VENUE_OFFER_COUNTER } from '../queries';
import { useOfferMutation } from '../useOfferMutation';

interface Props {
  /** The pod's live offer, whose latest move is the reader's own counter. */
  live: PodOffer;
  podId: string;
  side: VenueChatSide;
  /** Re-reads the live offer after the change. */
  onDone: () => unknown;
}

/**
 * What the side that made the latest counter may still do while the other side
 * has not seen it: change it (priced again, replacing it) or withdraw it (the
 * terms before it stand again). The server refuses both once they have seen it.
 */
export default function OfferReviseActions({ live, podId, side, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const target: OfferTarget = { side, pod_id: podId };
  const withdraw = useOfferMutation(WITHDRAW_VENUE_OFFER_COUNTER, target, () => setWithdrawing(false), onDone);
  const confirmWithdraw = async () => {
    await withdraw.run({ round: live.round }, t('availability.offers.revise.withdrawn'));
  };
  const closeWithdraw = () => {
    withdraw.clearError();
    setWithdrawing(false);
  };

  return (
    <Stack spacing={0.75} data-testid="offer-revise">
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('availability.offers.revise.unseenHint')}
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <DuncitButton variant="outlined" color="error" startIcon={<UndoRoundedIcon />} onClick={() => setWithdrawing(true)} data-testid="offer-withdraw">
          {t('availability.offers.revise.withdraw')}
        </DuncitButton>
        <DuncitButton variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setEditing(true)} data-testid="offer-edit">
          {t('availability.offers.revise.edit')}
        </DuncitButton>
      </Stack>
      <CounterOfferDialog open={editing} offer={live} target={target} mode="edit" onClose={() => setEditing(false)} onDone={onDone} />
      <ConfirmDialog
        open={withdrawing}
        title={t('availability.offers.revise.withdrawTitle')}
        message={
          <Stack spacing={1.5}>
            <span>{t('availability.offers.revise.withdrawMessage')}</span>
            {withdraw.error && <Alert severity="error">{withdraw.error}</Alert>}
          </Stack>
        }
        confirmLabel={t('availability.offers.revise.withdrawConfirm')}
        cancelLabel={t('availability.offers.cancel')}
        destructive
        busy={withdraw.busy}
        onConfirm={confirmWithdraw}
        onClose={closeWithdraw}
      />
    </Stack>
  );
}
