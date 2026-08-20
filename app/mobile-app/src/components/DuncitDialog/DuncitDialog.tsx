import type { ReactNode } from 'react';
import { Modal, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { DialogHeader } from '@/components/DuncitDialog/DialogHeader';
import { dialogMetrics, type DuncitDialogVariant } from '@/components/DuncitDialog/dialog-metrics';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

export interface DuncitDialogProps {
  open: boolean;
  onClose: () => void;
  testID: string;
  /** Omit for a chrome-less surface (a viewer, a scanner). */
  title?: string;
  subtitle?: string;
  /** Accessible label for the backdrop + close control. Localise it. */
  closeLabel: string;
  variant?: DuncitDialogVariant;
  /** Pinned under the scroll area — CTAs stay reachable at any content length. */
  footer?: ReactNode;
  /** Tapping the scrim closes it. Off for a destructive or in-flight step. */
  dismissOnBackdrop?: boolean;
  /** Show the header's ✕. Off when the footer already offers a way out. */
  showCloseButton?: boolean;
  /** Share of the usable height the dialog may take. */
  maxHeightRatio?: number;
  children: ReactNode;
}

/**
 * The one dialog every native surface renders.
 *
 * It exists because ~76 hand-rolled `<Modal>`s each re-decided the same four
 * things and mostly got at least one wrong: a fixed pixel `maxHeight` that is
 * right on one device in one orientation, a body with no `ScrollView` so long
 * content is simply cut off, a footer inside the scroll area so the CTA leaves
 * with the content, and no keyboard handling so a focused input sits behind the
 * keyboard.
 *
 * What it guarantees:
 *  - The sheet is capped against the LIVE window height, so rotation, split
 *    screen and small devices all re-measure (see `dialogMetrics`).
 *  - The body always scrolls; the header and footer never do.
 *  - The keyboard lifts the dialog AND shrinks its scroll area — lifting alone
 *    pushes the header off the top of a tall sheet.
 *  - `SafeAreaView`'s bottom strip is reserved under the footer, so a CTA is
 *    never under a gesture bar.
 *
 * Keyboard handling deliberately uses {@link useKeyboardInset}, NOT RN's
 * `KeyboardAvoidingView`: since Expo SDK 54 Android runs edge-to-edge, the
 * window no longer resizes and that component lands inputs behind the keyboard.
 */
export function DuncitDialog({
  open,
  onClose,
  testID,
  title,
  subtitle,
  closeLabel,
  variant = 'sheet',
  footer,
  dismissOnBackdrop = true,
  showCloseButton = true,
  maxHeightRatio = 0.88,
  children,
}: Readonly<DuncitDialogProps>) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();

  const metrics = dialogMetrics({
    variant,
    windowHeight,
    windowWidth,
    topInset: insets.top,
    keyboardInset,
    maxHeightRatio,
  });
  const sheet = variant === 'sheet';

  return (
    <Modal
      visible={open}
      transparent
      animationType={sheet ? 'slide' : 'fade'}
      onRequestClose={onClose}
      // Landscape is a real case for a host marking attendance at a door.
      supportedOrientations={['portrait', 'landscape']}
    >
      <ModalThemeScope>
        <YStack
          flex={1}
          testID={testID}
          justifyContent={sheet ? 'flex-end' : 'center'}
          alignItems={sheet ? 'stretch' : 'center'}
          // Lifts the whole stack clear of the keyboard.
          paddingBottom={metrics.bottomLift}
        >
          <YStack
            testID={`${testID}-backdrop`}
            role="button"
            aria-label={closeLabel}
            onPress={dismissOnBackdrop ? onClose : undefined}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />

          <YStack
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            borderBottomLeftRadius={sheet ? 0 : 20}
            borderBottomRightRadius={sheet ? 0 : 20}
            width={metrics.cardWidth}
            maxWidth={metrics.cardMaxWidth}
            maxHeight={metrics.maxHeight}
            // Without this the children's natural height wins over maxHeight and
            // the sheet grows straight off the screen.
            overflow="hidden"
          >
            {title ? (
              <DialogHeader
                title={title}
                subtitle={subtitle}
                closeLabel={closeLabel}
                testID={testID}
                onClose={showCloseButton ? onClose : undefined}
              />
            ) : null}

            <ScrollView
              testID={`${testID}-body`}
              // The body is what shrinks when the dialog hits its cap.
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ padding: 16, paddingTop: title ? 4 : 16 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            {footer ? (
              <YStack
                testID={`${testID}-footer`}
                paddingHorizontal={16}
                paddingTop={12}
                borderTopWidth={1}
                borderTopColor="$borderColor"
                // The gesture-bar strip, reserved under the CTA rather than
                // over it. Not SafeAreaView: it must collapse to 0 when the
                // keyboard is up, or the footer floats above the keyboard.
                paddingBottom={12 + (keyboardInset > 0 ? 0 : insets.bottom)}
              >
                {footer}
              </YStack>
            ) : (
              <YStack height={keyboardInset > 0 ? 0 : insets.bottom} />
            )}
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
