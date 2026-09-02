import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { isOtpCodeShape, type CompanionEntry } from '@duncit/utils';
import { VERIFY_ATTENDANCE_OTP } from '../attendance/queries';
import { REQUEST_COMPANION_OTP } from '../queries';
import { writeFailure } from '../write-failure';
import type { HostPodActionLabels } from '../labels';

export interface CompanionOtpApi {
  /** The row with a live challenge, or null while none has been sent. */
  activeIndex: number | null;
  challengeId: string;
  /** Echoed back only while nothing can really carry the code. */
  testCode: string;
  sending: boolean;
  verifying: boolean;
  error: string;
  start: (index: number, entry: CompanionEntry) => Promise<void>;
  /** Resolves with the spendable challenge, or null when the code is wrong. */
  submit: (code: string) => Promise<string | null>;
  cancel: () => void;
}

/**
 * One companion's one-time code, and only one at a time.
 *
 * The state lives here rather than on each row because there IS only ever one
 * live challenge: a code proves the person standing in front of the host, and
 * two open at a door is how the wrong person gets ticked. Starting a second row
 * is refused by `companionOtpState` in `@duncit/utils`, which the Tamagui twin
 * reads too (rule 27).
 *
 * Nothing is actually delivered yet — the server says so and hands back a test
 * code. The challenge, its expiry, its attempt limit and its single use are all
 * real, so wiring a transport changes nothing here.
 */
export function useCompanionOtp(
  podId: string,
  membershipId: string,
  labels: HostPodActionLabels,
): CompanionOtpApi {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [challengeId, setChallengeId] = useState('');
  const [testCode, setTestCode] = useState('');
  const [error, setError] = useState('');
  const [request, requestState] = useMutation<any>(REQUEST_COMPANION_OTP);
  const [verify, verifyState] = useMutation<any>(VERIFY_ATTENDANCE_OTP);

  const reset = () => {
    setActiveIndex(null);
    setChallengeId('');
    setTestCode('');
    setError('');
  };

  const start = async (index: number, entry: CompanionEntry) => {
    setError('');
    setActiveIndex(index);
    setChallengeId('');
    setTestCode('');
    try {
      const res = await request({
        variables: {
          input: {
            pod_doc_id: podId,
            membership_id: membershipId,
            name: entry.name.trim(),
            phone_extension: entry.phone_extension.trim(),
            phone_number: entry.phone_number.trim(),
            // WhatsApp is the channel this platform actually talks on, and the
            // medium is a parameter to one shared service — never a fork.
            mediums: ['WHATSAPP'],
          },
        },
      });
      const issued = res.data?.requestPodCompanionOtp;
      setChallengeId(issued?.challenge_id ?? '');
      setTestCode(issued?.test_code ?? '');
    } catch (e: unknown) {
      setError(writeFailure(e, labels.companionOtpFailed));
      setActiveIndex(null);
    }
  };

  const submit = async (code: string): Promise<string | null> => {
    if (!isOtpCodeShape(code)) {
      setError(labels.otpCodeInvalid);
      return null;
    }
    setError('');
    try {
      await verify({ variables: { challenge_id: challengeId, otp: code.trim() } });
      reset();
      return challengeId;
    } catch (e: unknown) {
      setError(writeFailure(e, labels.otpCodeInvalid));
      return null;
    }
  };

  return {
    activeIndex,
    challengeId,
    testCode,
    sending: requestState.loading,
    verifying: verifyState.loading,
    error,
    start,
    submit,
    cancel: reset,
  };
}
