import { Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  index: number;
  /** Whether this row may raise a code — false while another row holds one. */
  ready: boolean;
  /** This row's code is already out, so the CTA offers to send it again. */
  sent: boolean;
  /** This row's send is in flight. */
  sending: boolean;
  onStart: () => void;
}

/**
 * The send / resend CTA for one companion's code.
 *
 * A sibling of CompanionOtpPanel rather than part of it because Tamagui spells
 * "disabled" by hand — the press handler, the opacity and the ARIA state are
 * three separate conditionals where MUI takes one `disabled` prop — and those
 * alone put the panel over the cognitive-complexity limit (S3776).
 *
 * `ready`, `sent` and `sending` are worked out ONCE by the panel and passed in
 * rather than recomputed here, so no branch lives on only one render path
 * (rule 26g).
 */
export function CompanionSendButton({ index, ready, sent, sending, onStart }: Readonly<Props>) {
  const { t } = useTranslation();

  let label = t('mweb.hostScan.companionVerifyCta');
  if (sending) label = t('mweb.attendance.otpSending');
  else if (sent) label = t('mweb.attendance.otpResend');

  return (
    <XStack
      testID={`companion-otp-send-${index}`}
      role="button"
      aria-label={t('mweb.hostScan.companionVerifyCta')}
      aria-disabled={!ready}
      onPress={ready ? onStart : undefined}
      alignSelf="flex-start"
      height={36}
      paddingHorizontal={14}
      alignItems="center"
      justifyContent="center"
      borderRadius={999}
      borderWidth={1}
      borderColor="$borderColor"
      opacity={ready ? 1 : 0.55}
      pressStyle={PRESS_STYLE.ghost}
    >
      <Text fontSize={12.5} fontWeight="700" color="$color">
        {label}
      </Text>
    </XStack>
  );
}
