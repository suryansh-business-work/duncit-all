import { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import WindowOfferForm from '../window-offer/window-offer.form';
import { windowOfferDefaults, type WindowOfferInput } from '../window-offer/window-offer.types';
import { podRequestQuoteSource } from './queries';

interface Props {
  requestId: string;
  busy: boolean;
  /** Sends the proposal (proposePodPartnerWindow). */
  onPropose: (offer: WindowOfferInput) => Promise<unknown>;
}

/**
 * The receiving side of a Pod Request proposes the booking: a time inside the
 * venue's opening hours, the guests and how the venue is paid, priced by the
 * server. The other side then confirms or declines it — Partners and mWeb.
 */
export default function ProposeWindowBlock({ requestId, busy, onPropose }: Readonly<Props>) {
  const { t } = useTranslation();
  const formId = `pod-request-propose-${requestId}`;
  const quote = useMemo(() => podRequestQuoteSource(requestId), [requestId]);
  const defaults = useMemo(() => windowOfferDefaults(), []);

  return (
    <Stack spacing={1.5} data-testid="pod-request-propose">
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
        {t('podRequests.pickSlot')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('podRequests.pickSlotHint')}
      </Typography>
      <WindowOfferForm
        formId={formId}
        defaultValues={defaults}
        askPax
        quote={quote}
        onSubmit={async (offer) => {
          await onPropose(offer);
        }}
      />
      <DuncitButton
        type="submit"
        form={formId}
        variant="contained"
        loading={busy}
        endIcon={<SendRoundedIcon />}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="pod-request-send-slot"
      >
        {t('podRequests.sendSlot')}
      </DuncitButton>
    </Stack>
  );
}
