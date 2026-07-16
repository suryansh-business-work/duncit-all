import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
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

interface Props {
  pod: HostPodForComplete | null;
  onClose: () => void;
  onCompleted: () => void;
}

/** Host completes a pod: enter the venue bill + upload party media. The split is
 * previewed live; on submit two payout releases are created for Finance (2). */
export function PodCompleteDialog({ pod, onClose, onCompleted }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const hasVenue = !!pod?.venue_id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, watch } = useForm<PodCompleteValues>({
    resolver: zodResolver(buildPodCompleteSchema(hasVenue)),
    defaultValues: blankPodCompleteValues,
  });

  const billAmount = Number(watch('venue_bill_amount')) || 0;
  const { settlement, isLoading } = useSettlementPreview(pod?.id ?? null, billAmount);

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
      setError(err instanceof Error ? err.message : 'Could not complete the pod');
    } finally {
      setBusy(false);
    }
  });

  const dismiss = busy ? undefined : onClose;

  return (
    <Modal visible={!!pod} transparent animationType="fade" onRequestClose={dismiss}>
      <ModalThemeScope>
        <YStack flex={1} alignItems="center" justifyContent="center" testID="pod-complete-dialog">
          <YStack
            role="button"
            aria-label="Close"
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
            <SafeAreaView edges={[]}>
              <Text fontSize={17} fontWeight="900" color="$color" paddingBottom={10}>
                Complete pod
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <YStack gap={12} paddingBottom={6}>
                  <Text fontSize={12.5} color="$muted">
                    Upload party photos/videos (with the Duncit banner)
                    {hasVenue ? ' and the venue bill' : ''}. Paid after Finance approves.
                  </Text>
                  {hasVenue ? (
                    <>
                      <FormTextField
                        control={control}
                        name="venue_bill_amount"
                        label="Venue bill amount"
                        keyboardType="numeric"
                      />
                      <FormTextField
                        control={control}
                        name="bill_url"
                        label="Venue bill upload URL"
                      />
                    </>
                  ) : null}
                  <FormTextField
                    control={control}
                    name="media_text"
                    label="Party photos & videos (one URL per line)"
                    multiline
                  />
                  <SettlementSummary settlement={settlement} isLoading={isLoading} />
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
                  aria-label="Cancel"
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
                  <Text fontSize={14} fontWeight="800" color="$color">
                    Cancel
                  </Text>
                </XStack>
                <XStack
                  testID="pod-complete-submit"
                  role="button"
                  aria-label="Submit for approval"
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
                  <Text fontSize={14} fontWeight="900" color="$onPrimary">
                    {busy ? 'Submitting…' : 'Submit for approval'}
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
