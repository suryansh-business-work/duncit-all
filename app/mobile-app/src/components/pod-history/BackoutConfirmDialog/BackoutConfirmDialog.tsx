import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { ModalSafeArea } from '@/components/ModalSafeArea';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { usePolicy } from '@/hooks/usePolicies';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { stripHtml } from '@/utils/html';
import { ReleaseSeatsPicker } from '../ReleaseSeatsPicker';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { useLoadingRegion } from '@/components/Skeleton';

import { BackoutActions } from './BackoutActions';
import { BackoutHeader } from './BackoutHeader';
import type { BackoutConfirmDialogProps } from './types';

/** Backout confirmation sheet — spec copy + refund preview, and the live
 * "backout-terms" policy inline. RN twin of mWeb's BackoutConfirmDialog. */
export function BackoutConfirmDialog({
  open,
  busy,
  onClose,
  onConfirm,
  onViewTerms,
  refundAmount = null,
  refundPerSeat = null,
  mySeats = 1,
  deductionPct = 0,
  refundCoins = 0,
}: Readonly<BackoutConfirmDialogProps>) {
  const loadingRegion = useLoadingRegion();
  const { color } = useThemeColors();
  const { t } = useTranslation();
  const closeIfIdle = busy ? undefined : onClose;
  const { data, isLoading } = usePolicy(open ? 'backout-terms' : '');
  const terms = stripHtml(data?.policyBySlug?.content);
  const held = Math.max(1, Math.floor(mySeats) || 1);
  // Default to releasing everything — that is what Backout meant before a
  // booking could cover several people, and it stays the common case.
  const [seats, setSeats] = useState(held);
  useEffect(() => {
    if (open) setSeats(held);
  }, [open, held]);
  const releasing = Math.min(seats, held);
  // Per-seat is already net of the deduction, so the estimate scales with the
  // chosen count; releasing everything uses the server's own total.
  const estimate =
    releasing < held && refundPerSeat != null
      ? Math.round(refundPerSeat * releasing * 100) / 100
      : refundAmount;
  const estimateKey =
    releasing === 1 ? 'mweb.podDetails.refundEstimateOne' : 'mweb.podDetails.refundEstimateMany';
  // Coins scale with the seats given up, exactly as the cash estimate does.
  // Both stay estimates until the request is written — the server freezes the
  // authoritative pair onto it and that is what the ledger later credits.
  const coinsBack = held > 0 ? Math.floor((refundCoins * releasing) / held) : 0;
  const estimateLine = t(estimateKey, {
    vars: { amount: `₹${estimate}`, count: releasing, pct: deductionPct },
  });

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={closeIfIdle}>
      <ModalThemeScope>
        <YStack flex={1} testID="backout-dialog">
          <YStack
            pressStyle={PRESS_STYLE.surface}
            role="button"
            importantForAccessibility="no"
            aria-label={t('mweb.podDetails.close')}
            onPress={closeIfIdle}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            position="absolute"
            left={0}
            right={0}
            bottom={0}
            maxHeight="86%"
            backgroundColor="$surface"
            borderTopLeftRadius={28}
            borderTopRightRadius={28}
          >
            <ModalSafeArea edges={['bottom']} style={SHEET_SAFE_AREA}>
              <BackoutHeader color={color} onClose={closeIfIdle} />

              <YStack paddingHorizontal={16} gap={8}>
                <Text fontSize={14} fontWeight="600" color="$color">
                  {t('mweb.podDetails.backoutRefundOnlyIfFilled')}
                </Text>
                <ReleaseSeatsPicker
                  held={held}
                  value={releasing}
                  onChange={setSeats}
                  disabled={busy}
                />
                {estimate == null ? null : (
                  <Text
                    testID="backout-refund-amount"
                    fontSize={13.5}
                    fontWeight="600"
                    color="$accent"
                  >
                    {estimateLine}
                  </Text>
                )}
                {coinsBack > 0 ? (
                  <Text testID="backout-refund-coins" fontSize={13} fontWeight="700" color="$color">
                    {t('mweb.coin.refundCoinsEstimate', {
                      vars: { coins: coinsBack, pct: deductionPct },
                    })}
                  </Text>
                ) : null}
              </YStack>

              <ScrollView
                style={{ maxHeight: 280 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
              >
                {isLoading ? (
                  <Spinner {...loadingRegion} testID="backout-terms-loading" color="$primary" />
                ) : (
                  <Text fontSize={14} lineHeight={22} color="$color">
                    {terms || t('mweb.podDetails.reviewBackoutTerms')}
                  </Text>
                )}
              </ScrollView>

              <XStack paddingHorizontal={16} paddingTop={8}>
                <Text
                  pressStyle={PRESS_STYLE.inline}
                  testID="backout-view-terms"
                  role="button"
                  aria-label={t('mweb.podDetails.viewBackoutTerms')}
                  onPress={onViewTerms}
                  fontSize={12}
                  fontWeight="600"
                  color="$accent"
                >
                  {t('mweb.podDetails.readFullBackoutTerms')}
                </Text>
              </XStack>

              <BackoutActions
                busy={busy}
                releasing={releasing}
                onClose={onClose}
                onConfirm={onConfirm}
              />
            </ModalSafeArea>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
