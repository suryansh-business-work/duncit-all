import { useState } from 'react';
import { Text, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { WindowOfferForm, type WindowOffer } from '@/forms/window-offer';
import type { PodRequestActions } from '@/hooks/usePodRequestActions';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  requestId: string;
  venueId: string;
  actions: PodRequestActions;
}

/**
 * The receiver proposes a time the venue is open, the guests and how the
 * venue is paid — priced by the server as it is picked — and sends it for the
 * other side to confirm; the time is held meanwhile. mWeb twin: ProposeWindowBlock.
 */
export function ProposeWindowBlock({ requestId, venueId, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const send = async (offer: WindowOffer) => {
    if (await actions.proposeWindow(requestId, offer)) setOpen(false);
  };

  return (
    <YStack gap={14} testID="pod-request-propose">
      <Text role="heading" fontSize={16} fontWeight="700" color="$color">
        {t('windowOffer.proposeTitle')}
      </Text>
      <Text fontSize={13} color="$muted">
        {t('windowOffer.proposeHint')}
      </Text>
      <PrimaryButton
        testID="pod-request-open-propose"
        label={t('windowOffer.proposeTitle')}
        disabled={actions.busy}
        onPress={() => {
          actions.clearError();
          setOpen(true);
        }}
      />
      {open ? (
        <WindowOfferForm
          testID="pod-request-propose-sheet"
          venueId={venueId}
          title={t('windowOffer.proposeTitle')}
          subtitle={t('windowOffer.proposeHint')}
          submitLabel={t('windowOffer.propose')}
          askGuests
          busy={actions.busy}
          error={actions.error || undefined}
          priceOf={(offer) => actions.priceWindow(requestId, offer)}
          onClose={() => setOpen(false)}
          onSubmit={(offer) => fireAndForget(send(offer))}
        />
      ) : null}
    </YStack>
  );
}
