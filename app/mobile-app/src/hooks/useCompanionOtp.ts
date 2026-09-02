import { useCallback, useState } from 'react';
import { isOtpCodeShape, type CompanionEntry } from '@duncit/utils';

import { OtpMedium as GqlOtpMedium } from '@/generated/graphql/graphql';
import { RequestCompanionOtpDocument, VerifyAttendanceOtpDocument } from '@/graphql/attendance';
import { graphqlRequest } from '@/services/graphql.client';

export interface CompanionOtpApi {
  /** The row with a live challenge, or null while none has been sent. */
  activeIndex: number | null;
  challengeId: string;
  /** Echoed back only while nothing can really carry the code. */
  testCode: string;
  sending: boolean;
  verifying: boolean;
  error: string;
  start: (index: number, entry: CompanionEntry) => void;
  /** Resolves with the spendable challenge, or null when the code is wrong. */
  submit: (code: string) => Promise<string | null>;
  cancel: () => void;
}

/**
 * One companion's one-time code, and only one at a time — the native twin of
 * `@duncit/host-pod-actions`' useCompanionOtp (rule 27).
 *
 * The two are separate files because that package is MUI and this app cannot
 * consume it, but the rule about WHICH row may be verified lives in
 * `@duncit/utils` (`companionOtpState`), so the two can never disagree.
 *
 * Nothing is actually delivered yet; the server says so and hands back a test
 * code. The challenge, its expiry, its attempt limit and its single use are all
 * real, so wiring a transport changes nothing here.
 */
export function useCompanionOtp(
  podId: string,
  membershipId: string,
  codeInvalid: string,
  sendFailed: string,
): CompanionOtpApi {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [challengeId, setChallengeId] = useState('');
  const [testCode, setTestCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const cancel = useCallback(() => {
    setActiveIndex(null);
    setChallengeId('');
    setTestCode('');
    setError('');
  }, []);

  const start = useCallback(
    (index: number, entry: CompanionEntry) => {
      setError('');
      setActiveIndex(index);
      setChallengeId('');
      setTestCode('');
      setSending(true);
      graphqlRequest(
        RequestCompanionOtpDocument,
        {
          input: {
            pod_doc_id: podId,
            membership_id: membershipId,
            name: entry.name.trim(),
            phone_extension: entry.phone_extension.trim(),
            phone_number: entry.phone_number.trim(),
            // WhatsApp is the channel this platform actually talks on, and the
            // medium is a parameter to one shared service — never a fork.
            mediums: [GqlOtpMedium.Whatsapp],
          },
        },
        { auth: true },
      )
        .then((res) => {
          setChallengeId(res.requestPodCompanionOtp.challenge_id);
          setTestCode(res.requestPodCompanionOtp.test_code ?? '');
        })
        .catch((e: unknown) => {
          setError((e as Error)?.message || sendFailed);
          setActiveIndex(null);
        })
        .finally(() => setSending(false));
    },
    [membershipId, podId, sendFailed],
  );

  const submit = useCallback(
    async (code: string): Promise<string | null> => {
      if (!isOtpCodeShape(code)) {
        setError(codeInvalid);
        return null;
      }
      setError('');
      setVerifying(true);
      try {
        await graphqlRequest(
          VerifyAttendanceOtpDocument,
          { challenge_id: challengeId, otp: code.trim() },
          { auth: true },
        );
        cancel();
        return challengeId;
      } catch (e: unknown) {
        setError((e as Error)?.message || codeInvalid);
        return null;
      } finally {
        setVerifying(false);
      }
    },
    [cancel, challengeId, codeInvalid],
  );

  return { activeIndex, challengeId, testCode, sending, verifying, error, start, submit, cancel };
}
