import { formResolver } from '../../../utils/form-resolver';
import { useEffect, useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { ModalSafeArea } from '@/components/ModalSafeArea';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { HostResubmitPodDocument, ResubmitVenuesDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import { useVenueSlots } from '@/hooks/useVenueSlots';
import { fireAndForget } from '@/utils/fire-and-forget';
import { ResubmitFooter } from '../ResubmitFooter';
import {
  buildHostResubmitInput,
  podResubmitInitialValues,
  podResubmitSchema,
  type HostPodForResubmit,
  type PodResubmitValues,
  type ResubmitVenueOption,
} from '../pod-resubmit.form';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { ResubmitFields } from './ResubmitFields';

interface Props {
  pod: HostPodForResubmit | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Full edit + resubmission sheet for a venue-rejected pod: pick a different
 * venue or time slot, update the details and send the booking request again —
 * the same pod is reused, no new pod is created. RN twin of mWeb's
 * PodResubmitForm. */
export function PodResubmitDialog({ pod, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venues, setVenues] = useState<ResubmitVenueOption[]>([]);
  const { control, handleSubmit, reset, setValue, watch } = useForm<
    PodResubmitValues,
    any,
    PodResubmitValues
  >({
    resolver: formResolver<PodResubmitValues>(podResubmitSchema),
    defaultValues: podResubmitInitialValues(pod),
  });
  const venueId = watch('venue_id');
  const { slots, isLoading: slotsLoading } = useVenueSlots(venueId);

  useEffect(() => {
    reset(podResubmitInitialValues(pod));
    setError(null);
  }, [pod, reset]);

  useEffect(() => {
    if (!pod) return undefined;
    let active = true;
    graphqlRequest(ResubmitVenuesDocument, undefined, { auth: true })
      .then((res) => {
        if (active) setVenues(res.publicVenues ?? []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [pod]);

  const submit = handleSubmit(async (values) => {
    /* istanbul ignore next -- the dialog only mounts with a pod */
    if (!pod) return;
    setBusy(true);
    setError(null);
    try {
      await graphqlRequest(
        HostResubmitPodDocument,
        { pod_doc_id: pod.id, input: buildHostResubmitInput(values) },
        { auth: true },
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mweb.hostManage.couldNotResubmitThePod'));
    } finally {
      setBusy(false);
    }
  });

  const dismiss = busy ? undefined : onClose;

  return (
    <Modal visible={!!pod} transparent animationType="fade" onRequestClose={dismiss}>
      <ModalThemeScope>
        <KeyboardScreen flush>
          <YStack
            flex={1}
            alignItems="center"
            justifyContent="center"
            testID="pod-resubmit-dialog"
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
              maxHeight="88%"
              backgroundColor="$background"
              borderRadius={28}
              padding={18}
            >
              <ModalSafeArea edges={[]} style={SHEET_SAFE_AREA}>
                <Text
                  testID="pod-resubmit-title"
                  role="heading"
                  fontSize={17}
                  fontWeight="600"
                  color="$color"
                  paddingBottom={6}
                >
                  {t('mweb.hostPodActions.resubmitTitle')}
                </Text>
                <Text fontSize={12.5} color="$muted" paddingBottom={10}>
                  {t('mweb.hostPodActions.resubmitHint')}
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <YStack gap={12} paddingBottom={6}>
                    <ResubmitFields
                      control={control}
                      setValue={setValue}
                      venues={venues}
                      slots={slots}
                      slotsLoading={slotsLoading}
                      venueId={venueId}
                    />
                    {error ? (
                      <Text
                        role="alert"
                        testID="pod-resubmit-error"
                        fontSize={12.5}
                        color="$danger"
                      >
                        {error}
                      </Text>
                    ) : null}
                  </YStack>
                </ScrollView>
                <ResubmitFooter
                  busy={busy}
                  onCancel={dismiss}
                  onSubmit={() => fireAndForget(submit())}
                />
              </ModalSafeArea>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
