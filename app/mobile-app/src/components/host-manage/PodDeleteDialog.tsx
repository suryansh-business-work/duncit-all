import { useEffect, useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { HostDeletePodDocument, HostPodDeleteImpactDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  POD_DELETE_REASON_SUBJECTS,
  validateDeleteReason,
  type PodDeleteImpact,
} from './pod-edit.form';

interface Props {
  podId: string | null;
  podTitle: string;
  onClose: () => void;
  onDeleted: () => void;
}

/** Refund/audience impact line for the delete sheet. */
function ImpactSummary({ impact }: Readonly<{ impact: PodDeleteImpact }>) {
  if (impact.other_attendee_count === 0) {
    return (
      <Text testID="pod-delete-impact" fontSize={12.5} color="$muted">
        No one else has joined this pod — it will be deleted immediately.
      </Text>
    );
  }
  const refundLine =
    impact.refundable_payment_count > 0
      ? ` Deleting initiates a refund of ${impact.currency_symbol}${impact.refund_total} across ${impact.refundable_payment_count} payment(s), logged in the Finance portal.`
      : '';
  return (
    <Text testID="pod-delete-impact" fontSize={12.5} color="$danger">
      {impact.other_attendee_count} other attendee(s) joined this pod.{refundLine} All attendees
      will be emailed.
    </Text>
  );
}

/** Host's delete-pod sheet — a mandatory reason + refund impact preview (2B). */
export function PodDeleteDialog({ podId, podTitle, onClose, onDeleted }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const [impact, setImpact] = useState<PodDeleteImpact | null>(null);
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setImpact(null);
    setSubject('');
    setNote('');
    setError(null);
    if (!podId) return;
    let active = true;
    graphqlRequest(HostPodDeleteImpactDocument, { pod_doc_id: podId }, { auth: true })
      .then((res) => active && setImpact(res.hostPodDeleteImpact))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [podId]);

  const confirm = async () => {
    /* istanbul ignore next -- the dialog only mounts with a pod id */
    if (!podId) return;
    const reasonError = validateDeleteReason(subject, note);
    if (reasonError) {
      setError(reasonError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await graphqlRequest(
        HostDeletePodDocument,
        { pod_doc_id: podId, reason_subject: subject, reason_note: note.trim() || null },
        { auth: true },
      );
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the pod');
    } finally {
      setBusy(false);
    }
  };

  const dismiss = busy ? undefined : onClose;
  const hasRefunds = (impact?.refundable_payment_count ?? 0) > 0;
  const confirmLabel = hasRefunds ? 'Initiate refunds & delete' : 'Delete pod';

  return (
    <Modal visible={!!podId} transparent animationType="fade" onRequestClose={dismiss}>
      <ModalThemeScope>
        <YStack flex={1} alignItems="center" justifyContent="center" testID="pod-delete-dialog">
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
              <Text fontSize={17} fontWeight="900" color="$color">
                Delete pod
              </Text>
              <Text fontSize={13} color="$muted" paddingTop={4} paddingBottom={8}>
                You're deleting "{podTitle}". This can't be undone.
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <YStack gap={10} paddingBottom={6}>
                  {impact ? <ImpactSummary impact={impact} /> : <Spinner color="$primary" />}
                  <Text fontSize={13} fontWeight="800" color="$color" paddingTop={4}>
                    Reason
                  </Text>
                  {POD_DELETE_REASON_SUBJECTS.map((item) => {
                    const selected = subject === item;
                    return (
                      <XStack
                        key={item}
                        testID={`pod-delete-reason-${item}`}
                        role="button"
                        aria-label={item}
                        aria-pressed={selected}
                        onPress={() => setSubject(item)}
                        alignItems="center"
                        padding={10}
                        borderRadius={10}
                        borderWidth={1}
                        borderColor={selected ? '$primary' : '$borderColor'}
                        backgroundColor={selected ? '$primary' : 'transparent'}
                        pressStyle={{ opacity: 0.85 }}
                      >
                        <Text
                          fontSize={13.5}
                          fontWeight="700"
                          color={selected ? '$onPrimary' : '$color'}
                        >
                          {item}
                        </Text>
                      </XStack>
                    );
                  })}
                  <Input
                    testID="pod-delete-note"
                    value={note}
                    onChangeText={setNote}
                    placeholder="Note (shared with attendees)"
                    placeholderTextColor="$muted"
                    multiline
                    size="$4"
                    backgroundColor="$surface"
                    color="$color"
                    borderColor="$borderColor"
                  />
                  {error ? (
                    <Text testID="pod-delete-error" fontSize={12.5} color="$danger">
                      {error}
                    </Text>
                  ) : null}
                </YStack>
              </ScrollView>
              <XStack gap={12} paddingTop={12}>
                <XStack
                  testID="pod-delete-cancel"
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
                  testID="pod-delete-confirm"
                  role="button"
                  aria-label={confirmLabel}
                  aria-disabled={busy}
                  onPress={busy ? undefined : () => void confirm()}
                  flex={1}
                  height={46}
                  alignItems="center"
                  justifyContent="center"
                  gap={8}
                  borderRadius={12}
                  backgroundColor="$danger"
                  opacity={busy ? 0.7 : 1}
                  pressStyle={{ opacity: 0.85 }}
                >
                  {busy ? <Spinner size="small" color={onPrimary} /> : null}
                  <Text fontSize={14} fontWeight="900" color={onPrimary} numberOfLines={1}>
                    {busy ? 'Deleting…' : confirmLabel}
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
