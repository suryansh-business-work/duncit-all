import { useEffect, useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { isOtp } from '@duncit/regex';
import { Input, Text, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fireAndForget } from '@/utils/fire-and-forget';
import {
  requestEmailVerificationOtp,
  verifyEmailVerificationOtp,
} from '@/services/email-verification.service';

interface Props {
  email?: string | null;
  verified: boolean;
  /** Refresh the account so the verified badge updates immediately. */
  onVerified: () => void;
  /** Arriving from the Home nudge — mail the OTP straight away so the user
   * lands on a screen that is already waiting for the code. */
  autoSend?: boolean;
}

/**
 * Verify the account's email with a mailed OTP — the RN twin of mWeb's
 * EmailVerificationForm. "Send OTP" mails a code to the address already on the
 * account (neither mutation takes an email), then the code is entered here.
 *
 * The Home banner deep-links to this section, so it always renders on the
 * Profile screen while the email is unverified.
 */
export function EmailVerificationSection({
  email,
  verified,
  onVerified,
  autoSend = false,
}: Readonly<Props>) {
  const { primary, muted } = useThemeColors();
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [requested, setRequested] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async () => {
    setError(null);
    setMessage(null);
    setSending(true);
    try {
      const result = await requestEmailVerificationOtp();
      setRequested(true);
      setDevOtp(result.devOtp);
      setMessage(`OTP sent to ${email}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the OTP');
    } finally {
      setSending(false);
    }
  };

  // Deep-linked from Home: mail the code once, so the user lands on a screen
  // already waiting for it. The ref keeps a re-render from sending twice.
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (!autoSend || verified || !email || autoSentRef.current) return;
    autoSentRef.current = true;
    fireAndForget(sendOtp());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sendOtp is stable in effect
  }, [autoSend, verified, email]);

  const verify = async () => {
    setError(null);
    setVerifying(true);
    try {
      await verifyEmailVerificationOtp(otp.trim());
      setMessage('Email verified.');
      setOtp('');
      onVerified();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid OTP');
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return (
      <XStack testID="email-verified" alignItems="center" gap={8}>
        <MaterialIcons name="verified" size={18} color={primary} />
        <Text fontSize={13} fontWeight="700" color="$color">
          Your email is verified.
        </Text>
      </XStack>
    );
  }

  const idleSendLabel = requested ? 'Resend OTP' : 'Send OTP';
  const sendLabel = sending ? 'Sending…' : idleSendLabel;
  // Same rule the mWeb twin's Zod schema enforces, from the shared package —
  // so a short code is caught here instead of costing a server round-trip.
  const otpValid = isOtp(otp.trim());
  const otpHint = otp.length > 0 && !otpValid;

  return (
    <YStack testID="email-verification" gap={10}>
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name="mark-email-read" size={18} color={primary} />
        <Text fontSize={14} fontWeight="800" color="$color">
          Verify email
        </Text>
      </XStack>
      <Text fontSize={13} color="$muted">
        {email || 'Add an email address to verify your account.'}
      </Text>

      {message ? (
        <Text testID="email-verification-message" fontSize={12} color="$primary">
          {message}
        </Text>
      ) : null}
      {devOtp ? (
        <Text testID="email-verification-dev-otp" fontSize={12} color="$muted">
          Dev OTP: {devOtp}
        </Text>
      ) : null}
      {error ? (
        <Text testID="email-verification-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}

      <XStack gap={8} alignItems="center">
        <Input
          testID="email-verification-otp"
          flex={1}
          size="$4"
          backgroundColor="$background"
          color="$color"
          placeholderTextColor="$muted"
          borderColor={error || otpHint ? '$danger' : '$borderColor'}
          value={otp}
          onChangeText={setOtp}
          placeholder="Enter OTP"
          keyboardType="number-pad"
          maxLength={6}
          aria-label="Email verification OTP"
        />
        <XStack
          testID="email-verification-send"
          role="button"
          aria-label={idleSendLabel}
          aria-disabled={sending || !email}
          onPress={() => {
            if (!sending && email) fireAndForget(sendOtp());
          }}
          height={46}
          paddingHorizontal={14}
          alignItems="center"
          justifyContent="center"
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          opacity={sending || !email ? 0.5 : 1}
          pressStyle={{ opacity: 0.8 }}
        >
          <Text fontSize={13} fontWeight="800" color={muted}>
            {sendLabel}
          </Text>
        </XStack>
      </XStack>

      {otpHint ? (
        <Text testID="email-verification-hint" fontSize={12} color="$danger">
          Enter the OTP we sent
        </Text>
      ) : null}

      <PrimaryButton
        testID="email-verification-submit"
        // PrimaryButton swaps the label for a Spinner while loading, so a
        // "Verifying…" branch here would never render.
        label="Verify"
        loading={verifying}
        disabled={verifying || !otpValid}
        onPress={verify}
      />
    </YStack>
  );
}
