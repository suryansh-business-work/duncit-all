import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PodMediaSummary } from '@/components/pod-media/PodMediaSummary';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { CompletePodSettlementDocument } from '@/graphql/settlement';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettlementPreview } from '@/hooks/useSettlementPreview';
import { fireAndForget } from '@/utils/fire-and-forget';
import { SettlementSummary } from './SettlementSummary';
import {
  blankPodCompleteValues,
  buildCompleteInput,
  buildPodCompleteSchema,
  type HostPodForComplete,
  type PodCompleteValues,
} from './pod-complete.form';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  pod: HostPodForComplete | null;
  onClose: () => void;
  onCompleted: () => void;
}

/** Host completes a pod: enter the venue bill amount. The pod's own media is
 * shown, not asked for — it is uploaded on the Upload Pod Media screen. The
 * split is previewed live; on submit two payout releases are created for Finance. */
export function PodCompleteDialog({ pod, onClose, onCompleted }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const hasVenue = !!pod?.venue_id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, watch } = useForm<PodCompleteValues>({
    resolver: zodResolver(buildPodCompleteSchema(hasVenue)),
    defaultValues: blankPodCompleteValues,
  });

  const billAmount = Number(watch('venue_bill_amount')) || 0;
  const {
    settlement,
    isLoading,
    error: previewError,
  } = useSettlementPreview(pod?.id ?? null, billAmount);

  const submit = handleSubmit(async (values) => {
    /* istanbul ignore next -- the dialog only mounts with a pod */
    if (!pod) return;
    setBusy(true);
    setError(null);
    try {
      await graphqlRequest(
        CompletePodSettlementDocument,
        { input: buildCompleteInput(values, pod.id) },
        { auth: true },
      );
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mweb.hostManage.couldNotCompleteThePod'));
    } finally {
      setBusy(false);
    }
  });

  const dismiss = busy ? undefined : onClose;

  return (
    <Modal visible={!!pod} transparent animationType="fade" onRequestClose={dismiss}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} alignItems="center" justifyContent="center" testID="pod-complete-dialog">
            <YStack
              role="button"
              aria-label={t('mweb.common.close')}
              onPress={dismiss}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.5)"
            />
            <YStack
              width="92%"
              maxWidth={460}
              maxHeight="86%"
              backgroundColor="$background"
              borderRadius={20}
              padding={18}
            >
              <SafeAreaView edges={[]} style={SHEET_SAFE_AREA}>
                <Text fontSize={17} fontWeight="700" color="$color" paddingBottom={10}>
                  Complete pod
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <YStack gap={12} paddingBottom={6}>
                    <Text fontSize={12.5} color="$muted">
                      Upload party photos/videos (with the Duncit banner). Payouts are credited to
                      the wallets on completion.
                    </Text>
                    {hasVenue ? (
                      <FormTextField
                        control={control}
                        name="venue_bill_amount"
                        label={t('mweb.hostManage.venueBillAmount')}
                        keyboardType="numeric"
                        required
                      />
                    ) : null}
                    {pod ? <PodMediaSummary podId={pod.id} onLeave={onClose} /> : null}
                    <SettlementSummary settlement={settlement} isLoading={isLoading} />
                    {previewError && !settlement && !isLoading ? (
                      <Text testID="pod-complete-preview-error" fontSize={12.5} color="$danger">
                        {previewError}
                      </Text>
                    ) : null}
                    {error ? (
                      <Text testID="pod-complete-error" fontSize={12.5} color="$danger">
                        {error}
                      </Text>
                    ) : null}
                  </YStack>
                </ScrollView>
                <XStack gap={12} paddingTop={12}>
                  <XStack
                    testID="pod-complete-cancel"
                    role="button"
                    aria-label={t('mweb.common.cancel')}
                    aria-disabled={busy}
                    onPress={dismiss}
                    flex={1}
                    height={46}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={12}
                    borderWidth={1}
                    borderColor="$borderColor"
                    opacity={busy ? 0.6 : 1}
                    pressStyle={{ opacity: 0.85 }}
                  >
                    <Text fontSize={14} fontWeight="600" color="$color">
                      Cancel
                    </Text>
                  </XStack>
                  <XStack
                    testID="pod-complete-submit"
                    role="button"
                    aria-label={t('mweb.hostManage.completePod')}
                    aria-disabled={busy}
                    onPress={busy ? undefined : () => fireAndForget(submit())}
                    flex={1}
                    height={46}
                    alignItems="center"
                    justifyContent="center"
                    gap={8}
                    borderRadius={12}
                    backgroundColor="$primary"
                    opacity={busy ? 0.7 : 1}
                    pressStyle={{ opacity: 0.85 }}
                  >
                    {busy ? <Spinner size="small" color={onPrimary} /> : null}
                    <Text fontSize={14} fontWeight="700" color="$onPrimary">
                      {busy ? 'Completing…' : 'Complete pod'}
                    </Text>
                  </XStack>
                </XStack>
              </SafeAreaView>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
