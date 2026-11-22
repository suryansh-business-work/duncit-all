import { useEffect, useState, type ComponentProps } from 'react';
import { Modal } from 'react-native';
import { ModalSafeArea } from '@/components/ModalSafeArea';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StudioEmailGateNotice } from '@/components/studio-options/StudioEmailGateNotice';
import { useStudioEmailGate } from '@/hooks/useStudioEmailGate';
import { useThemeColors } from '@/hooks/useThemeColors';
import { STUDIO_LABEL, availableModes, type StudioMode } from '@/utils/studio-mode';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { STUDIO_EMAIL_GATE_KEYS } from '@duncit/utils';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

const ICONS: Record<StudioMode, IconName> = {
  USER: 'person-outline',
  HOST: 'dashboard',
  VENUE: 'store',
  ECOMM: 'inventory-2',
  CLUB: 'groups',
};

const ACTIVE_CAPTION = 'Active right now';
const PENDING_CAPTION = 'Selected — press Switch to confirm';

/** Label for the confirm button — naming the target makes the two-step flow obvious. */
const switchButtonLabel = (changed: boolean, mode: StudioMode) =>
  changed ? `Switch to ${STUDIO_LABEL[mode]}` : 'Switch';

interface Props {
  open: boolean;
  roles: string[];
  /** `is_product_visible` — off, and the E-commerce bubble is not offered. */
  showProducts?: boolean;
  current: StudioMode;
  onClose: () => void;
  onSelect: (mode: StudioMode) => void;
}

/** Bubble-style role switcher — one bubble per mode; the picked one lifts up
 * and expands into the big primary card below. Picking a bubble only stages the
 * choice; nothing switches until the Switch button below is pressed. Host,
 * Venue and Club Admin wait for a verified email: picking one says so in place
 * and the button offers to verify instead (useStudioEmailGate).
 * Identical to mWeb's StudioSwitchDialog (B3-5). */
export function StudioSwitchDialog({
  open,
  roles,
  showProducts = true,
  current,
  onClose,
  onSelect,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color, onPrimary, primary } = useThemeColors();
  const emailGate = useStudioEmailGate();
  const [pending, setPending] = useState<StudioMode>(current);
  const locked = emailGate.blocks(pending);
  const confirmSwitch = () => {
    if (!locked) {
      onSelect(pending);
      return;
    }
    onClose();
    emailGate.verifyEmail();
  };

  // The dialog stays mounted between openings, so the staged pick is reset every
  // time it opens — otherwise it would reopen on a choice the user abandoned.
  useEffect(() => {
    setPending(current);
  }, [open, current]);

  const changed = pending !== current;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          testID="studio-switch-dialog"
          onAccessibilityEscape={onClose}
        >
          <YStack
            pressStyle={PRESS_STYLE.surface}
            testID="studio-switch-backdrop"
            importantForAccessibility="no"
            role="button"
            aria-label={t('mweb.common.close')}
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            width="86%"
            maxWidth={420}
            backgroundColor="$surface"
            borderRadius={28}
            padding={20}
            gap={14}
          >
            <ModalSafeArea edges={[]}>
              <Text
                testID="studio-switch-title"
                role="heading"
                fontSize={18}
                fontWeight="600"
                color="$color"
                paddingBottom={16}
              >
                {t('mweb.common.switchRole')}
              </Text>
              <XStack
                justifyContent="center"
                gap={10}
                paddingBottom={16}
                role="radiogroup"
                aria-label={t('mweb.common.switchRole')}
              >
                {availableModes(roles, { products: showProducts }).map((option) => {
                  const selected = option.mode === pending;
                  return (
                    <YStack
                      key={option.mode}
                      testID={`studio-switch-${option.mode}`}
                      tabIndex={0}
                      role="radio"
                      aria-label={STUDIO_LABEL[option.mode]}
                      aria-checked={selected}
                      onPress={() => setPending(option.mode)}
                      flex={1}
                      maxWidth={52}
                      aspectRatio={1}
                      alignItems="center"
                      justifyContent="center"
                      borderRadius={26}
                      backgroundColor={selected ? '$primary' : '$soft'}
                      pressStyle={PRESS_STYLE.control}
                    >
                      <MaterialIcons
                        name={ICONS[option.mode]}
                        size={22}
                        color={selected ? onPrimary : color}
                      />
                    </YStack>
                  );
                })}
              </XStack>
              <XStack
                testID="studio-switch-active-card"
                alignItems="center"
                gap={12}
                borderRadius={18}
                paddingHorizontal={16}
                paddingVertical={14}
                backgroundColor="$primarySoft"
              >
                <YStack flex={1}>
                  <Text fontSize={17} fontWeight="600" color="$color" numberOfLines={1}>
                    {STUDIO_LABEL[pending]}
                  </Text>
                  <Text fontSize={12} fontWeight="500" color="$muted">
                    {changed ? PENDING_CAPTION : ACTIVE_CAPTION}
                  </Text>
                </YStack>
                <MaterialIcons name="check-circle" size={22} color={primary} />
              </XStack>
              {locked ? (
                <YStack paddingTop={16}>
                  <StudioEmailGateNotice testID="studio-switch-email-gate" />
                </YStack>
              ) : null}
              <YStack paddingTop={16}>
                <PrimaryButton
                  testID="studio-switch-confirm"
                  label={locked ? t(STUDIO_EMAIL_GATE_KEYS.action) : switchButtonLabel(changed, pending)}
                  disabled={!changed && !locked}
                  onPress={confirmSwitch}
                />
              </YStack>
            </ModalSafeArea>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
