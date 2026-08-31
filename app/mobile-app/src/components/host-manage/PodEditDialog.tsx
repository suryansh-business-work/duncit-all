import { useEffect } from 'react';
import { Modal, ScrollView } from 'react-native';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { MediaUploadField } from '@/components/create-pod/MediaUploadField';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { ContentCheckNotice } from './ContentCheckNotice';
import { PodSpotsField } from './PodSpotsField';
import { usePodEditSave } from './usePodEditSave';
import { usePodSpotLimits } from './usePodSpotLimits';
import {
  podEditInitialValues,
  podEditSchema,
  type HostPodSummary,
  type PodEditValues,
} from './pod-edit.form';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  pod: HostPodSummary | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Host's pod edit sheet — title, images, description and the pod's capacity.
 *
 * "Flexible pod count": a pod published with fewer spots than the space it
 * booked can hold is not stuck that way. The range comes from the server, which
 * guards the write with the same rules — a host may only ever raise it.
 *
 * Saving runs the same AI content check publishing does (mWeb twin: rule 27):
 * a pod that met the guidelines when it was created can be edited into one
 * that does not, so the check belongs on every write, not just the first.
 */
export function PodEditDialog({ pod, onClose, onSaved }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const { t } = useTranslation();
  const { control, handleSubmit, reset, setError, setValue } = useForm<PodEditValues, any, PodEditValues>({
    resolver: zodResolver(podEditSchema) as unknown as Resolver<PodEditValues, any, PodEditValues>,
    defaultValues: podEditInitialValues(pod),
  });
  const limits = usePodSpotLimits(pod?.id);
  const { busy, error, blocked, save, clear } = usePodEditSave(
    pod?.id,
    setError,
    onSaved,
    !!limits,
  );

  useEffect(() => {
    reset(podEditInitialValues(pod));
    clear();
    // `clear` is a fresh closure each render; re-seeding is keyed on the pod.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod, reset]);

  // The limits land after the reset above, so the capacity is seeded from the
  // SERVER's current figure rather than the row the list happened to hold.
  useEffect(() => {
    if (limits) setValue('no_of_spots_text', String(limits.current));
  }, [limits, setValue]);

  const submit = handleSubmit(save);

  const dismiss = busy ? undefined : onClose;

  return (
    <Modal visible={!!pod} transparent animationType="fade" onRequestClose={dismiss}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} alignItems="center" justifyContent="center" testID="pod-edit-dialog">
            <YStack
              pressStyle={PRESS_STYLE.surface}
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
              {/* Header, scroller and footer are direct children of the capped
                  card on purpose. Any view in between (a SafeAreaView used to
                  sit here) is unshrinkable — RN defaults flexShrink to 0 — so it
                  sizes to its full content, leaves the ScrollView unbounded, and
                  spills the upload box and the buttons outside the card. */}
              <Text fontSize={17} fontWeight="700" color="$color" paddingBottom={10}>
                Edit pod
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <YStack gap={12} paddingBottom={6}>
                  <FormTextField
                    control={control}
                    name="pod_title"
                    label={t('mweb.common.title')}
                    required
                    hint="3–120 characters"
                  />
                  <FormTextField
                    control={control}
                    name="pod_description"
                    label={t('mweb.common.description')}
                    multiline
                    required
                    hint="At least 10 characters"
                  />
                  <Controller
                    control={control}
                    name="media_text"
                    render={({ field, fieldState }) => (
                      <MediaUploadField
                        value={field.value}
                        onChange={field.onChange}
                        error={fieldState.error?.message}
                        label={t('mweb.hostManage.media')}
                      />
                    )}
                  />
                  {limits ? (
                    <Controller
                      control={control}
                      name="no_of_spots_text"
                      render={({ field, fieldState }) => (
                        <PodSpotsField
                          limits={limits}
                          value={field.value || String(limits.current)}
                          onChange={field.onChange}
                          error={fieldState.error?.message}
                        />
                      )}
                    />
                  ) : null}
                  <ContentCheckNotice
                    violations={blocked}
                    title={t('mweb.hostPodEdit.contentCheck')}
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
                  pressStyle={PRESS_STYLE.control}
                >
                  <Text fontSize={14} fontWeight="600" color="$color">
                    Cancel
                  </Text>
                </XStack>
                <XStack
                  testID="pod-edit-save"
                  role="button"
                  aria-label={t('mweb.hostManage.saveChanges')}
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
                  pressStyle={PRESS_STYLE.control}
                >
                  {busy ? <Spinner size="small" color={onPrimary} /> : null}
                  <Text fontSize={14} fontWeight="700" color="$onPrimary">
                    {busy ? 'Saving…' : 'Save changes'}
                  </Text>
                </XStack>
              </XStack>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
