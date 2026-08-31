import { useCallback, useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { PodAttendanceLabels, PodAttendanceRow } from '@duncit/utils';

import {
  attendanceOtpCodeSchema,
  attendanceOtpInitialValues,
  buildAttendanceOtpInput,
  buildAttendanceOtpSchema,
  type AttendanceOtpValues,
} from '@/forms/attendance-otp';
import { OtpMedium as GqlOtpMedium } from '@/generated/graphql/graphql';
import { RequestAttendanceOtpDocument, VerifyAttendanceOtpDocument } from '@/graphql/attendance';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * Codegen emits `OtpMedium` as a TS enum, while the shared roster logic in
 * `@duncit/utils` (which the native app and mWeb both read) uses a plain string
 * union — the values are identical, the nominal types are not. Mapped at the
 * request boundary so the union stays the one both surfaces reason about.
 */
const toGqlMedium = (medium: 'SMS' | 'WHATSAPP') =>
  medium === 'SMS' ? GqlOtpMedium.Sms : GqlOtpMedium.Whatsapp;

/** Hoisted so the three-way choice sits at nesting 0 (Sonar S3358). */
function sendButtonLabel(sending: boolean, sent: boolean, labels: PodAttendanceLabels): string {
  if (sending) return labels.otpSending;
  return sent ? labels.otpResend : labels.otpSend;
}

/**
 * The verify-the-attendee form and its two calls.
 *
 * The native twin of `@duncit/host-pod-actions`' OTP dialog state (rule 27),
 * folded into a hook because this app has no Apollo to hold mutation state for
 * it. The schema is shared with mWeb through `@duncit/utils`' shape helpers, so
 * the two never disagree about what a phone number is.
 */
export function useAttendanceOtp(
  podId: string,
  row: PodAttendanceRow | null,
  labels: PodAttendanceLabels,
) {
  const form = useForm<AttendanceOtpValues, any, AttendanceOtpValues>({
    resolver: zodResolver(buildAttendanceOtpSchema(labels)) as unknown as Resolver<AttendanceOtpValues, any, AttendanceOtpValues>,
    defaultValues: attendanceOtpInitialValues(row),
  });
  const { getValues, reset, setError, trigger } = form;
  const [challengeId, setChallengeId] = useState('');
  const [testCode, setTestCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendError, setSendError] = useState('');

  // A different attendee is a different challenge — never carry the previous
  // one's verified code onto somebody else's row.
  useEffect(() => {
    reset(attendanceOtpInitialValues(row));
    setChallengeId('');
    setTestCode('');
    setSendError('');
  }, [row, reset]);

  const send = useCallback(() => {
    if (!row) return;
    setSendError('');
    // Everything except the code, which does not exist yet.
    trigger(['name', 'extension', 'number', 'mediums'])
      .then((ok) => {
        if (!ok) return null;
        setSending(true);
        const input = buildAttendanceOtpInput(getValues(), podId, row.membership_id);
        return graphqlRequest(
          RequestAttendanceOtpDocument,
          { input: { ...input, mediums: input.mediums.map(toGqlMedium) } },
          { auth: true },
        );
      })
      .then((res) => {
        if (!res) return;
        setChallengeId(res.requestPodAttendanceOtp.challenge_id);
        setTestCode(res.requestPodAttendanceOtp.test_code ?? '');
      })
      .catch((e: unknown) => setSendError((e as Error)?.message ?? ''))
      .finally(() => setSending(false));
  }, [getValues, podId, row, trigger]);

  /** Resolves with the spendable challenge id, or null when the code is wrong. */
  const verify = useCallback(async (): Promise<string | null> => {
    const parsed = attendanceOtpCodeSchema(labels).safeParse(getValues('code'));
    if (!parsed.success) {
      setError('code', { message: parsed.error.issues[0]?.message });
      return null;
    }
    setVerifying(true);
    setSendError('');
    try {
      await graphqlRequest(
        VerifyAttendanceOtpDocument,
        { challenge_id: challengeId, otp: parsed.data.trim() },
        { auth: true },
      );
      return challengeId;
    } catch (e: unknown) {
      setSendError((e as Error)?.message ?? '');
      return null;
    } finally {
      setVerifying(false);
    }
  }, [challengeId, getValues, labels, setError]);

  return {
    form,
    challengeId,
    testCode,
    sending,
    verifying,
    error: sendError,
    sendLabel: sendButtonLabel(sending, !!challengeId, labels),
    send,
    verify,
  };
}
