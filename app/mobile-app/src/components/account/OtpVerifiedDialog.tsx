import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';
import { logs } from '@duncit/logs';

import { DuncitDialog } from '@/components/DuncitDialog/DuncitDialog';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  email?: string | null;
  onClose: () => void;
}

/** The tick pops in (spring scale + fade) each time the dialog opens; a device
 * set to Reduce Motion gets it already in place. */
function VerifiedTick({ open, label }: Readonly<{ open: boolean; label: string }>) {
  const { success } = useThemeColors();
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const settle = () => {
      scale.setValue(1);
      opacity.setValue(1);
    };
    scale.setValue(0.6);
    opacity.setValue(0);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch((error: unknown) => {
        logs.mobileApp.error('OtpVerifiedDialog', 'isReduceMotionEnabled', { error });
        return false;
      })
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) return settle();
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 240,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      });
    return () => {
      cancelled = true;
    };
  }, [open, scale, opacity]);

  return (
    <Animated.View
      testID="otp-verified-tick"
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ alignSelf: 'center', opacity, transform: [{ scale }] }}
    >
      <MaterialIcons name="check-circle" size={72} color={success} />
    </Animated.View>
  );
}

/**
 * Confirms a profile email OTP was accepted — the RN twin of mWeb's
 * `profile-page/email-verification-form/OtpVerifiedDialog`.
 */
export function OtpVerifiedDialog({ open, email, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const body = email
    ? t('mweb.profile.otpVerifiedBody', { vars: { email } })
    : t('mweb.profile.otpVerifiedBodyNoEmail');

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="otp-verified-dialog"
      closeLabel={t('mweb.common.close')}
      footer={
        <PrimaryButton
          testID="otp-verified-dialog-done"
          label={t('mweb.common.done')}
          onPress={onClose}
        />
      }
    >
      <YStack gap={12} alignItems="center" paddingVertical={8} role="status">
        <VerifiedTick open={open} label={t('mweb.profile.otpVerifiedAnimation')} />
        <Text role="heading" fontSize={18} fontWeight="700" color="$color" textAlign="center">
          {t('mweb.profile.otpVerifiedTitle')}
        </Text>
        <Text fontSize={14} color="$muted" textAlign="center">
          {body}
        </Text>
      </YStack>
    </DuncitDialog>
  );
}
