import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { usePolicy } from '@/hooks/usePolicies';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { stripHtml } from '@/utils/html';
import { ReleaseSeatsPicker } from './ReleaseSeatsPicker';

export interface BackoutConfirmDialogProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (seats: number) => void;
  onViewTerms: () => void;
  /** Estimated refund after the Backouts deduction (null for free bookings). */
  refundAmount?: number | null;
  /** Refund for ONE seat after the deduction — prices a partial release. */
  refundPerSeat?: number | null;
  /** Seats this booking holds. More than one offers a partial release. */
  mySeats?: number;
  /** Backouts deduction % applied to the refund estimate. */
  deductionPct?: number;
}

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
}: Readonly<BackoutConfirmDialogProps>) {
  const { color, onPrimary } = useThemeColors();
  const { t } = useTranslation();
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
  const estimateLine = t(estimateKey, {
    vars: { amount: `₹${estimate}`, count: releasing, pct: deductionPct },
  });

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={busy ? undefined : onClose}
    >
      <ModalThemeScope>
        <YStack flex={1} testID="backout-dialog">
          <YStack
            role="button"
            aria-label={t('mweb.podDetails.close')}
            onPress={busy ? undefined : onClose}
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
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
          >
            <SafeAreaView edges={['bottom']}>
              <XStack alignItems="center" justifyContent="space-between" padding={16}>
                <Text fontSize={18} fontWeight="700" color="$color">
                  {t('mweb.podDetails.backoutTitle')}
                </Text>
                <XStack
                  testID="backout-close"
                  role="button"
                  aria-label={t('mweb.podDetails.close')}
                  onPress={busy ? undefined : onClose}
                  width={32}
                  height={32}
                  alignItems="center"
                  justifyContent="center"
                >
                  <MaterialIcons name="close" size={20} color={color} />
                </XStack>
              </XStack>

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
                    color="$primary"
                  >
                    {estimateLine}
                  </Text>
                )}
              </YStack>

              <ScrollView
                style={{ maxHeight: 280 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
              >
                {isLoading ? (
                  <Spinner testID="backout-terms-loading" color="$primary" />
                ) : (
                  <Text fontSize={14} lineHeight={22} color="$color">
                    {terms || t('mweb.podDetails.reviewBackoutTerms')}
                  </Text>
                )}
              </ScrollView>

              <XStack paddingHorizontal={16} paddingTop={8}>
                <Text
                  testID="backout-view-terms"
                  role="button"
                  aria-label={t('mweb.podDetails.viewBackoutTerms')}
                  onPress={onViewTerms}
                  fontSize={12}
                  fontWeight="600"
                  color="$primary"
                >
                  {t('mweb.podDetails.readFullBackoutTerms')}
                </Text>
              </XStack>

              <XStack padding={16} gap={12}>
                <XStack
                  testID="backout-cancel"
                  role="button"
                  aria-label={t('mweb.podDetails.close')}
                  aria-disabled={busy}
                  onPress={busy ? undefined : onClose}
                  flex={1}
                  height={48}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="$borderColor"
                  opacity={busy ? 0.6 : 1}
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontSize={14} fontWeight="600" color="$color">
                    {t('mweb.podDetails.close')}
                  </Text>
                </XStack>
                <XStack
                  testID="backout-confirm"
                  role="button"
                  aria-label={t('mweb.podDetails.confirmBackout')}
                  aria-disabled={busy}
                  onPress={busy ? undefined : () => onConfirm(releasing)}
                  flex={2}
                  height={48}
                  alignItems="center"
                  justifyContent="center"
                  gap={8}
                  borderRadius={12}
                  backgroundColor="$danger"
                  opacity={busy ? 0.7 : 1}
                  pressStyle={{ opacity: 0.85 }}
                >
                  {busy ? <Spinner size="small" color={onPrimary} /> : null}
                  <Text fontSize={14} fontWeight="700" color={onPrimary}>
                    {busy ? t('mweb.podDetails.backingOut') : t('mweb.podDetails.confirmBackout')}
                  </Text>
                </XStack>
              </XStack>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
