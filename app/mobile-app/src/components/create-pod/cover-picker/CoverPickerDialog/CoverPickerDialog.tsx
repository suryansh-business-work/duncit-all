import { useState } from 'react';
import { Modal } from 'react-native';
import { ModalSafeArea } from '@/components/ModalSafeArea';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { ScrollView, Text, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PexelsTab } from '../PexelsTab';
import { SelectionTray } from '../SelectionTray';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { CoverPickerActions } from './CoverPickerActions';
import { CoverPickerHeader } from './CoverPickerHeader';
import { CoverPickerTabs } from './CoverPickerTabs';
import { DeviceAddTile } from './DeviceAddTile';

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
  /**
   * Offer the phone alone — no stock library. For a picker whose answer has to
   * be a real photograph of something that happened (a pod's own media), where
   * a stock tab is not merely discouraged but wrong.
   */
  deviceOnly?: boolean;
  /** The sheet's heading — a field that is not pod media names itself. */
  title?: string;
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
  deviceOnly = false,
  title,
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
          <YStack
            flex={1}
            justifyContent="flex-end"
            testID="cover-picker"
            onAccessibilityEscape={onClose}
          >
            <YStack
              pressStyle={PRESS_STYLE.surface}
              importantForAccessibility="no"
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
              backgroundColor="$surface"
              borderTopLeftRadius={28}
              borderTopRightRadius={28}
              maxHeight="88%"
              padding={20}
            >
              <ModalSafeArea edges={['bottom']} style={SHEET_SAFE_AREA}>
                <CoverPickerHeader
                  title={title ?? t('mweb.createPod.addPodMedia')}
                  closeLabel={close}
                  color={color}
                  onClose={onClose}
                />

                <CoverPickerTabs
                  tab={tab}
                  onTab={setTab}
                  deviceOnly={deviceOnly}
                  color={color}
                  onPrimary={onPrimary}
                />

                <SelectionTray urls={tray} max={max} onRemove={onRemove} deviceOnly={deviceOnly} />

                {error ? (
                  <Text
                    role="alert"
                    testID="cover-picker-error"
                    fontSize={12}
                    color="$danger"
                    paddingTop={8}
                  >
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
                    <DeviceAddTile
                      busy={busy}
                      atLimit={atLimit}
                      label={chooseFromPhone}
                      hint={hint}
                      primary={primary}
                      muted={muted}
                      onPickDevice={onPickDevice}
                    />
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

                {/* flexShrink 0: letting the grid shrink (above) is only half
                    the answer — React Native still shrinks THIS row when a
                    freshly-loaded page of Pexels results overflows the sheet,
                    which is how "Use these images" disappeared as the images
                    came in. The action row is the one thing that must never
                    give way. */}
                <CoverPickerActions
                  trayCount={tray.length}
                  doneLabel={doneLabel}
                  onPrimary={onPrimary}
                  onClose={onClose}
                  onDone={onDone}
                />
              </ModalSafeArea>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
