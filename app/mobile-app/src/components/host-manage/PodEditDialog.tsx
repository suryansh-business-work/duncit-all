import { useEffect, useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { MediaUploadField } from '@/components/create-pod/MediaUploadField';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { HostUpdatePodDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fireAndForget } from '@/utils/fire-and-forget';
import {
  buildHostUpdateInput,
  podEditInitialValues,
  podEditSchema,
  type HostPodSummary,
  type PodEditValues,
} from './pod-edit.form';

interface Props {
  pod: HostPodSummary | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Host's limited pod edit sheet — only title, images and description (2A). */
export function PodEditDialog({ pod, onClose, onSaved }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, reset } = useForm<PodEditValues>({
    resolver: zodResolver(podEditSchema),
    defaultValues: podEditInitialValues(pod),
  });

  useEffect(() => {
    reset(podEditInitialValues(pod));
    setError(null);
  }, [pod, reset]);

  const submit = handleSubmit(async (values) => {
    /* istanbul ignore next -- the dialog only mounts with a pod */
    if (!pod) return;
    setBusy(true);
    setError(null);
    try {
      await graphqlRequest(
        HostUpdatePodDocument,
        { pod_doc_id: pod.id, input: buildHostUpdateInput(values) },
        { auth: true },
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the pod');
    } finally {
      setBusy(false);
    }
  });

  const dismiss = busy ? undefined : onClose;

  return (
    <Modal visible={!!pod} transparent animationType="fade" onRequestClose={dismiss}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} alignItems="center" justifyContent="center" testID="pod-edit-dialog">
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
                  Edit pod
                </Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <YStack gap={12} paddingBottom={6}>
                    <FormTextField control={control} name="pod_title" label="Title" />
                    <FormTextField
                      control={control}
                      name="pod_description"
                      label="Description"
                      multiline
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
                      <Text testID="pod-edit-error" fontSize={12.5} color="$danger">
                        {error}
                      </Text>
                    ) : null}
                  </YStack>
                </ScrollView>
                <XStack gap={12} paddingTop={12}>
                  <XStack
                    testID="pod-edit-cancel"
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
                    testID="pod-edit-save"
                    role="button"
                    aria-label="Save changes"
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
                      {busy ? 'Saving…' : 'Save changes'}
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
