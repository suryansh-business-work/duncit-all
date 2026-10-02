import { useEffect, useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { ModalSafeArea } from '@/components/ModalSafeArea';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { Input, Spinner, Text, YStack } from 'tamagui';

import { Field } from '@/components/Field';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { HostDeletePodDocument, HostPodDeleteImpactDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import { validateDeleteReason, type PodDeleteImpact } from '../pod-edit.form';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { fireAndForget } from '@/utils/fire-and-forget';

import { DeleteReasonPicker } from './DeleteReasonPicker';
import { ImpactSummary } from './ImpactSummary';
import { PodDeleteActions } from './PodDeleteActions';

interface Props {
  podId: string | null;
  podTitle: string;
  onClose: () => void;
  onDeleted: () => void;
}

/** Host's delete-pod sheet — a mandatory reason + refund impact preview (2B). */
export function PodDeleteDialog({ podId, podTitle, onClose, onDeleted }: Readonly<Props>) {
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t('mweb.hostManage.couldNotCancelThePod'));
    } finally {
      setBusy(false);
    }
  };

  const dismiss = busy ? undefined : onClose;
  const hasRefunds = (impact?.refundable_payment_count ?? 0) > 0;
  const confirmLabel = hasRefunds ? 'Initiate refunds & cancel' : 'Cancel pod';

  return (
    <Modal visible={!!podId} transparent animationType="fade" onRequestClose={dismiss}>
      <ModalThemeScope>
        <KeyboardScreen flush>
          <YStack
            flex={1}
            alignItems="center"
            justifyContent="center"
            testID="pod-delete-dialog"
            onAccessibilityEscape={dismiss}
          >
            <YStack
              pressStyle={PRESS_STYLE.surface}
              importantForAccessibility="no"
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
              borderRadius={28}
              padding={18}
            >
              <ModalSafeArea edges={[]} style={SHEET_SAFE_AREA}>
                <Text
                  testID="pod-delete-title"
                  role="heading"
                  fontSize={17}
                  fontWeight="600"
                  color="$color"
                >
                  Cancel pod
                </Text>
                <Text fontSize={13} color="$muted" paddingTop={4} paddingBottom={8}>
                  You're cancelling "{podTitle}". This can't be undone.
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <YStack gap={10} paddingBottom={6}>
                    {impact ? (
                      <ImpactSummary impact={impact} />
                    ) : (
                      <Spinner
                        role="progressbar"
                        aria-label={t('mweb.a11y.loading')}
                        color="$primary"
                      />
                    )}
                    <Text fontSize={13} fontWeight="600" color="$color" paddingTop={4}>
                      Reason
                    </Text>
                    <DeleteReasonPicker subject={subject} onSubject={setSubject} />
                    <Field label={t('mweb.hostManage.noteForAttendees')}>
                      <Input
                        testID="pod-delete-note"
                        value={note}
                        onChangeText={setNote}
                        placeholder={t('mweb.hostManage.noteSharedWithAttendees')}
                        placeholderTextColor="$muted"
                        aria-label={t('mweb.hostManage.noteForAttendees')}
                        multiline
                        size="$4"
                        backgroundColor="$surface"
                        color="$color"
                        borderColor="$borderColor"
                      />
                    </Field>
                    {error ? (
                      <Text role="alert" testID="pod-delete-error" fontSize={12.5} color="$danger">
                        {error}
                      </Text>
                    ) : null}
                  </YStack>
                </ScrollView>
                <PodDeleteActions
                  busy={busy}
                  confirmLabel={confirmLabel}
                  onDismiss={dismiss}
                  onConfirm={() => fireAndForget(confirm())}
                />
              </ModalSafeArea>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
