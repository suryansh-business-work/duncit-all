import { useEffect, useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { MediaUploadField } from '@/components/create-pod/MediaUploadField';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { HostResubmitPodDocument, ResubmitVenuesDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import { useVenueSlots } from '@/hooks/useVenueSlots';
import { fireAndForget } from '@/utils/fire-and-forget';
import { ResubmitFooter } from './ResubmitFooter';
import { SlotPickerField, VenuePickerField } from './ResubmitPickers';
import {
  buildHostResubmitInput,
  podResubmitInitialValues,
  podResubmitSchema,
  type HostPodForResubmit,
  type PodResubmitValues,
  type ResubmitVenueOption,
} from './pod-resubmit.form';

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venues, setVenues] = useState<ResubmitVenueOption[]>([]);
  const { control, handleSubmit, reset, setValue, watch } = useForm<PodResubmitValues>({
    resolver: zodResolver(podResubmitSchema),
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
      setError(err instanceof Error ? err.message : 'Could not resubmit the pod');
    } finally {
      setBusy(false);
    }
  });

  const dismiss = busy ? undefined : onClose;

  return (
    <Modal visible={!!pod} transparent animationType="fade" onRequestClose={dismiss}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} alignItems="center" justifyContent="center" testID="pod-resubmit-dialog">
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
              maxHeight="88%"
              backgroundColor="$background"
              borderRadius={20}
              padding={18}
            >
              <SafeAreaView edges={[]}>
                <Text fontSize={17} fontWeight="900" color="$color" paddingBottom={6}>
                  Edit & resubmit pod
                </Text>
                <Text fontSize={12.5} color="$muted" paddingBottom={10}>
                  Select a different venue or choose a different time slot — your booking request is
                  sent to the venue again when you resubmit. Your pod is kept, no new pod is
                  created.
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <YStack gap={12} paddingBottom={6}>
                    <FormTextField
                      control={control}
                      name="pod_title"
                      label="Title"
                      required
                      hint="3–120 characters"
                    />
                    <FormTextField
                      control={control}
                      name="pod_description"
                      label="Description"
                      multiline
                      required
                      hint="At least 10 characters"
                    />
                    <Controller
                      control={control}
                      name="venue_id"
                      render={({ field, fieldState }) => (
                        <VenuePickerField
                          venues={venues}
                          value={field.value}
                          error={fieldState.error?.message}
                          onChange={(next) => {
                            field.onChange(next);
                            setValue('venue_slot_id', '');
                          }}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="venue_slot_id"
                      render={({ field, fieldState }) => (
                        <SlotPickerField
                          slots={slots}
                          loading={slotsLoading}
                          hasVenue={!!venueId}
                          value={field.value}
                          error={fieldState.error?.message}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="media_text"
                      render={({ field, fieldState }) => (
                        <MediaUploadField
                          value={field.value}
                          onChange={field.onChange}
                          error={fieldState.error?.message}
                          label="Media"
                        />
                      )}
                    />
                    {error ? (
                      <Text testID="pod-resubmit-error" fontSize={12.5} color="$danger">
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
              </SafeAreaView>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
