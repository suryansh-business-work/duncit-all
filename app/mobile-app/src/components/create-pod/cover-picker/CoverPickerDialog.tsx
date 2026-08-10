import { useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PexelsTab } from './PexelsTab';
import { SelectionTray } from './SelectionTray';

const TAB_KEYS = ['mweb.createPod.tabFromPhone', 'mweb.createPod.tabPexels'];

interface Props {
  open: boolean;
  /** Seeded from the pod's sub-category. */
  seed: string;
  /** Most this visit may return — what is left of the cap. */
  max: number;
  /** Picked so far, this visit. */
  tray: string[];
  /** True while a device upload is running. */
  busy: boolean;
  hint: string;
  onPickDevice: () => void;
  onPexelsPicked: (url: string) => void;
  onRemove: (url: string) => void;
  onDone: () => void;
  onClose: () => void;
}

/**
 * The cover picker — the Tamagui twin of the MUI `MediaPickerDialog` in
 * `@duncit/media-picker`, which the native app cannot import (rule 27 says the
 * two behave identically; the package is MUI, so only the components differ).
 *
 * Two tabs, one tray. The phone tab hands off to the OS gallery, which does its
 * own multi-select; the Pexels tab opens already searching for the pod's
 * sub-category. Both drop into the same tray, so a cover can be two stock
 * photos and one of the host's own, chosen in a single visit.
 */
export function CoverPickerDialog({
  open,
  seed,
  max,
  tray,
  busy,
  hint,
  onPickDevice,
  onPexelsPicked,
  onRemove,
  onDone,
  onClose,
}: Readonly<Props>) {
  const { color, muted, primary, onPrimary } = useThemeColors();
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const atLimit = tray.length >= max;
  const close = t('mweb.auth.close');
  const chooseFromPhone = t('mweb.createPod.chooseFromPhone');
  const doneLabel =
    tray.length > 1
      ? t('mweb.createPod.useTheseCount', { vars: { count: tray.length } })
      : t('mweb.createPod.useThisImage');

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} justifyContent="flex-end" testID="cover-picker">
            <YStack
              role="button"
              aria-label={close}
              onPress={onClose}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.5)"
            />
            <YStack
              backgroundColor="$background"
              borderTopLeftRadius={22}
              borderTopRightRadius={22}
              maxHeight="88%"
              padding={16}
            >
              <SafeAreaView edges={['bottom']}>
                <XStack alignItems="center" justifyContent="space-between" paddingBottom={12}>
                  <Text fontSize={17} fontWeight="700" color="$color">
                    {t('mweb.createPod.addPodMedia')}
                  </Text>
                  <XStack
                    testID="cover-picker-close"
                    role="button"
                    aria-label={close}
                    onPress={onClose}
                    width={32}
                    height={32}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <MaterialIcons name="close" size={20} color={color} />
                  </XStack>
                </XStack>

                <XStack gap={8} paddingBottom={12}>
                  {TAB_KEYS.map((key, index) => (
                    <XStack
                      key={key}
                      testID={`cover-tab-${index}`}
                      role="button"
                      aria-label={t(key)}
                      onPress={() => setTab(index)}
                      flex={1}
                      height={40}
                      alignItems="center"
                      justifyContent="center"
                      borderRadius={999}
                      borderWidth={1}
                      borderColor={tab === index ? '$primary' : '$borderColor'}
                      backgroundColor={tab === index ? '$primary' : 'transparent'}
                      pressStyle={{ opacity: 0.85 }}
                    >
                      <Text
                        fontSize={13.5}
                        fontWeight="700"
                        color={tab === index ? onPrimary : color}
                      >
                        {t(key)}
                      </Text>
                    </XStack>
                  ))}
                </XStack>

                <SelectionTray urls={tray} max={max} onRemove={onRemove} />

                {error ? (
                  <Text testID="cover-picker-error" fontSize={12} color="$danger" paddingTop={8}>
                    {error}
                  </Text>
                ) : null}

                {/* React Native defaults `flexShrink` to 0, so once the sheet hit
                    its 88% cap nothing gave way and each "Load more" page pushed
                    the Cancel / "Use this image" row off the bottom. Letting the
                    grid shrink keeps that row on screen. `flexShrink` rather than
                    `flex`, so a short list (the phone tab) still renders a short
                    sheet instead of always filling 88%. */}
                <ScrollView
                  style={{ flexShrink: 1, minHeight: 0, marginTop: 12 }}
                  contentContainerStyle={{ paddingBottom: 12 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {tab === 0 ? (
                    <YStack
                      testID="cover-device-add"
                      role="button"
                      aria-label={chooseFromPhone}
                      aria-disabled={busy || atLimit}
                      onPress={busy || atLimit ? undefined : onPickDevice}
                      alignItems="center"
                      justifyContent="center"
                      gap={8}
                      paddingVertical={28}
                      borderRadius={16}
                      borderWidth={2}
                      borderColor="$borderColor"
                      borderStyle="dashed"
                      backgroundColor="$surface"
                      opacity={busy || atLimit ? 0.6 : 1}
                      pressStyle={{ opacity: 0.85 }}
                    >
                      <MaterialIcons name="add-photo-alternate" size={26} color={primary} />
                      <Text fontSize={14} fontWeight="600" color="$color">
                        {atLimit ? t('mweb.createPod.mediaAtMaximum') : chooseFromPhone}
                      </Text>
                      <Text fontSize={12} color={muted}>
                        {atLimit ? t('mweb.createPod.removeOneToAdd') : hint}
                      </Text>
                    </YStack>
                  ) : (
                    <PexelsTab
                      active={tab === 1}
                      seed={seed}
                      orientation="landscape"
                      atLimit={atLimit}
                      onPicked={onPexelsPicked}
                      onError={setError}
                    />
                  )}
                </ScrollView>

                <XStack gap={12} paddingTop={8}>
                  <XStack
                    testID="cover-picker-cancel"
                    role="button"
                    aria-label={t('mweb.createPod.cancel')}
                    onPress={onClose}
                    flex={1}
                    height={48}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={12}
                    borderWidth={1}
                    borderColor="$borderColor"
                    pressStyle={{ opacity: 0.85 }}
                  >
                    <Text fontSize={14} fontWeight="600" color="$color">
                      {t('mweb.createPod.cancel')}
                    </Text>
                  </XStack>
                  <XStack
                    testID="cover-picker-done"
                    role="button"
                    aria-label={t('mweb.createPod.useSelectedImages')}
                    aria-disabled={tray.length === 0}
                    onPress={tray.length === 0 ? undefined : onDone}
                    flex={2}
                    height={48}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={12}
                    backgroundColor="$primary"
                    opacity={tray.length === 0 ? 0.6 : 1}
                    pressStyle={{ opacity: 0.85 }}
                  >
                    <Text fontSize={14} fontWeight="700" color={onPrimary}>
                      {doneLabel}
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
