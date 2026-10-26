import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { VenueChatOfferMove } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { ConfirmSheet } from '@/components/DuncitDialog';
import type { OfferSide, OfferTerms } from '@/components/venue-offer/offer-format';
import { VenueOfferCounterForm } from '@/forms/venue-offer-counter';
import type { OfferReviseAnswers } from '@/hooks/useOfferRevise';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  podId: string;
  /** The pod's live offer: the round both answers are sent for, and the booking's guests. */
  live: OfferTerms;
  /** The reader's own counter, as its chat line records it — the edit starts from it. */
  move: VenueChatOfferMove;
  side: OfferSide;
  revise: OfferReviseAnswers;
}

/**
 * The reader's own newest counter, while the other side has not seen it yet:
 * Edit re-opens the counter sheet filled with it — note and photos included —
 * priced live as it changes, and Withdraw (confirmed) takes it back, the terms
 * before it on the table again. Both are sent for the round read, and the
 * server refuses once the other side has seen it. mWeb twin: OfferReviseActions.
 */
export function OfferReviseActions({ podId, live, move, side, revise }: Readonly<Props>) {
  const { t } = useTranslation();
  const { danger, primary } = useThemeColors();
  const [editing, setEditing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const close = () => {
    revise.clearError();
    setEditing(false);
    setWithdrawing(false);
  };
  // A sheet closes once its answer went through (or the terms moved first).
  const settle = (answered: Promise<boolean>) =>
    fireAndForget(answered.then((done) => done && close()));
  const own = {
    model: move.model,
    rate: move.rate,
    minGuests: move.min_guests,
    offerings: move.offerings,
    note: move.note,
    images: move.images,
  };
  const withdrawLabel = t('availability.offers.revise.withdrawConfirm');

  return (
    <YStack gap={8}>
      <Text testID="offer-revise-hint" fontSize={12} color="$muted">
        {t('availability.offers.revise.unseenHint')}
      </Text>
      <XStack gap={8} flexWrap="wrap">
        <DuncitButton
          testID="offer-revise-edit"
          label={t('availability.offers.revise.edit')}
          onPress={() => setEditing(true)}
          variant="outline"
          size="sm"
          disabled={revise.busy}
          icon={<MaterialIcons name="edit" size={16} color={primary} />}
        />
        <DuncitButton
          testID="offer-revise-withdraw"
          label={t('availability.offers.revise.withdraw')}
          onPress={() => setWithdrawing(true)}
          variant="outline"
          tone="danger"
          size="sm"
          disabled={revise.busy}
          icon={<MaterialIcons name="undo" size={16} color={danger} />}
        />
      </XStack>
      {editing ? (
        <VenueOfferCounterForm
          side={side}
          edit
          target={{ side: 'EDIT', podId }}
          terms={own}
          maxGuests={live.pax}
          busy={revise.busy}
          error={revise.error}
          onClose={close}
          onSend={(terms, note) => settle(revise.edit(terms, note, live.round))}
        />
      ) : null}
      <ConfirmSheet
        open={withdrawing}
        busy={revise.busy}
        testIDPrefix="offer-withdraw"
        title={t('availability.offers.revise.withdrawTitle')}
        message={t('availability.offers.revise.withdrawMessage')}
        cancelLabel={t('availability.offers.cancel')}
        confirmLabel={withdrawLabel}
        busyLabel={withdrawLabel}
        error={revise.error}
        onCancel={close}
        onConfirm={() => settle(revise.withdraw(live.round))}
      />
    </YStack>
  );
}
