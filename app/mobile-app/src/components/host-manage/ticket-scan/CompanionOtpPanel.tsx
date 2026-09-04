import { useState } from 'react';
import { Text, YStack } from 'tamagui';
import type { Translator } from '@duncit/i18n';
import type { CompanionEntry, CompanionOtpState } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import type { CompanionOtpApi } from '@/hooks/useCompanionOtp';
import { CompanionSendButton } from './CompanionSendButton';
import { CompanionCodeEntry } from './CompanionCodeEntry';

/**
 * Why the button is dead, in one line under it. The Tamagui twin of mWeb's
 * hintFor (rule 27), word for word through the shared bundle.
 *
 * Every key is written out in full: the localization gate reads literal
 * t('…') calls, so a key built from a variable ships untranslated.
 */
function hintFor(state: CompanionOtpState, t: Translator['t']): string {
  if (state === 'BLOCKED') return t('mweb.hostScan.companionOtpBlocked');
  if (state === 'DUPLICATE') return t('mweb.hostScan.companionOtpDuplicate');
  if (state === 'INCOMPLETE') return t('mweb.hostScan.companionOtpIncomplete');
  return t('mweb.hostScan.companionOtpHint');
}

interface Props {
  index: number;
  entry: CompanionEntry;
  state: CompanionOtpState;
  otp: CompanionOtpApi;
  onVerified: (challengeId: string) => void;
}

/**
 * One companion's WhatsApp code — sent, then read back. The Tamagui twin of
 * mWeb's CompanionOtpPanel (rule 27), word for word through the shared bundle.
 *
 * Optional by design: an attendee whose phone is dead or abroad must still be
 * able to walk in, so this proves the people it can and records which ones
 * those were. What it must NOT do is prove two people at once, which is why the
 * button is dead on every other row while a code is live.
 *
 * The CTA and the code box are siblings rather than inline JSX because Tamagui
 * hand-rolls what MUI takes as a `disabled` prop, and the nine conditionals
 * that cost put this one function over the complexity limit (S3776). Every
 * value both of them read is computed HERE, once (rule 26g).
 */
export function CompanionOtpPanel({ index, entry, state, otp, onVerified }: Readonly<Props>) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const live = otp.activeIndex === index;
  const sent = live && !!otp.challengeId;

  if (state === 'VERIFIED') {
    return (
      <Text testID={`companion-verified-${index}`} fontSize={12} fontWeight="700" color="$success">
        {t('mweb.hostScan.companionVerified')}
      </Text>
    );
  }

  const check = () => {
    otp
      .submit(code)
      .then((challengeId) => challengeId && onVerified(challengeId))
      .catch(() => undefined);
  };

  // Clearing the box is part of starting: a proof names ONE number, so a code
  // typed against the previous send no longer describes this row.
  const start = () => {
    setCode('');
    otp.start(index, entry);
  };

  // Hoisted out of the JSX so the choice sits at nesting 0 (S3358).
  const hint = hintFor(state, t);

  return (
    <YStack gap={6}>
      <Text fontSize={11.5} color="$muted">
        {hint}
      </Text>
      <CompanionSendButton
        index={index}
        ready={state === 'READY'}
        sent={sent}
        sending={otp.sending && live}
        onStart={start}
      />

      {sent ? (
        <CompanionCodeEntry
          index={index}
          code={code}
          onCodeChange={setCode}
          testCode={otp.testCode}
          verifying={otp.verifying}
          onVerify={check}
          onCancel={otp.cancel}
        />
      ) : null}

      {live && otp.error ? (
        <Text testID={`companion-otp-error-${index}`} fontSize={12} color="$danger">
          {otp.error}
        </Text>
      ) : null}
    </YStack>
  );
}
