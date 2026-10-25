import { formResolver } from '../../../utils/form-resolver';
import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { ModalSafeArea } from '@/components/ModalSafeArea';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { HostResubmitPodDocument, ResubmitVenuesDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';
import { ResubmitFooter } from '../ResubmitFooter';
import {
  buildHostResubmitInput,
  makePodResubmitSchema,
  podResubmitInitialValues,
  type HostPodForResubmit,
  type PodResubmitValues,
  type ResubmitVenueOption,
  type VenueOfferPrefill,
} from '../pod-resubmit.form';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { ResubmitFields } from './ResubmitFields';

interface Props {
  pod: HostPodForResubmit | null;
  onClose: () => void;
  onSaved: () => void;
  /**
   * The terms of the offer the venue declined (or let expire): the form starts
   * from them at the pod's venue — window, space, pets, pricing option, amount,
   * the points and the note — so a new offer is an edit of the last one.
   */
  offerPrefill?: VenueOfferPrefill | null;
}

/** The prefill's own terms, as a value: a parent that rebuilds the object (or
 * hands over a whole chat move) each render never resets what was typed. */
const prefillKeyOf = (prefill: VenueOfferPrefill | null | undefined): string =>
  prefill
    ? JSON.stringify({
        model: prefill.model,
        rate: prefill.rate,
        offerings: prefill.offerings,
        note: prefill.note,
        start_at: prefill.start_at,
        end_at: prefill.end_at,
        space_label: prefill.space_label,
        pets: prefill.pets,
      })
    : '';

/** Full edit + resubmission sheet for a venue-rejected pod: pick a different
 * venue or time, the spots from the venue's minimum, how the venue is paid and
 * what the host needs from it, update the details and send the offer again —
 * the same pod is reused, no new pod is created. RN twin of mWeb's
 * PodResubmitDialog. */
export function PodResubmitDialog({ pod, onClose, onSaved, offerPrefill }: Readonly<Props>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venues, setVenues] = useState<ResubmitVenueOption[]>([]);
  const schema = useMemo(() => makePodResubmitSchema(t), [t]);
  const prefillKey = prefillKeyOf(offerPrefill);
  const prefill = useMemo<VenueOfferPrefill | null>(
    () => (prefillKey ? (JSON.parse(prefillKey) as VenueOfferPrefill) : null),
    [prefillKey],
  );
  const form = useForm<PodResubmitValues, unknown, PodResubmitValues>({
    resolver: formResolver<PodResubmitValues>(schema),
    defaultValues: podResubmitInitialValues(pod, prefill),
  });
  const { handleSubmit, reset } = form;

  useEffect(() => {
    reset(podResubmitInitialValues(pod, prefill));
    setError(null);
  }, [pod, prefill, reset]);

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
                    <ResubmitFields form={form} venues={venues} />
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
