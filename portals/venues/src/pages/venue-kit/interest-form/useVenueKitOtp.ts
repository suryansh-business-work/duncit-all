import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import {
  REQUEST_EMAIL_CODE,
  REQUEST_PHONE_CODE,
  SUBMIT_INTEREST,
  VERIFY_EMAIL_CODE,
  VERIFY_PHONE_CODE,
  type CodeRequest,
} from '../queries';
import { VENUE_KIT_DIAL_CODE, type VenueKitBusy, type VenueKitOtpActions, type VenueKitOtpState } from './venue-kit-interest.types';

const EMPTY: Omit<VenueKitOtpState, 'busy'> = { emailNote: null, emailToken: null, phoneNote: null, phoneToken: null };

/**
 * The console's Venue Kit interest form, step by step, over the same public
 * mutations the website posts: email code (no captcha — the console is signed
 * in), optional +91 SMS code, then the submit that spends both proofs.
 * `onRegistered` lets the page refresh its list once a venue is on it.
 */
export function useVenueKitOtp(onRegistered: () => void): { state: VenueKitOtpState; actions: VenueKitOtpActions } {
  const { t } = useTranslation();
  const [proofs, setProofs] = useState(EMPTY);
  const [busy, setBusy] = useState<VenueKitBusy>(null);
  const [requestEmail] = useMutation(REQUEST_EMAIL_CODE);
  const [verifyEmailCode] = useMutation(VERIFY_EMAIL_CODE);
  const [requestPhone] = useMutation(REQUEST_PHONE_CODE);
  const [verifyPhoneCode] = useMutation(VERIFY_PHONE_CODE);
  const [submitInterest] = useMutation(SUBMIT_INTEREST);

  /** Runs one step: its spinner, and its failure told to the person and logged for us. */
  const run = useCallback(
    async (step: Exclude<VenueKitBusy, null>, work: () => Promise<void>): Promise<boolean> => {
      setBusy(step);
      try {
        await work();
        return true;
      } catch (error) {
        const reason = parseApiError(error, t('venueKit.form.failed'));
        notifyError(reason);
        logs.portal.venues.warn('venueKit', step, { msg: 'Venue Kit interest step failed', reason });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [t]
  );

  const noteFor = useCallback(
    (result: CodeRequest | undefined, key: string, vars: Record<string, string>) => {
      if (result?.test_code) return t('venueKit.form.testCode', { vars: { code: result.test_code } });
      return t(key, { vars: { ...vars, minutes: String(result?.expires_in_minutes ?? '') } });
    },
    [t]
  );

  const actions = useMemo<VenueKitOtpActions>(
    () => ({
      sendEmail: (name, email) =>
        run('sendEmail', async () => {
          const { data } = await requestEmail({ variables: { input: { name, email } } });
          setProofs({ ...EMPTY, emailNote: noteFor(data?.requestVenueKitEmailOtp, 'venueKit.form.emailCodeSent', { email }) });
        }),
      verifyEmail: (email, code) =>
        run('verifyEmail', async () => {
          const { data } = await verifyEmailCode({ variables: { input: { email, code } } });
          setProofs((p) => ({ ...p, emailToken: data?.verifyVenueKitEmailOtp.token ?? null }));
        }),
      sendPhone: (phone) =>
        run('sendPhone', async () => {
          const input = { email_token: proofs.emailToken ?? '', phone_extension: VENUE_KIT_DIAL_CODE, phone_number: phone };
          const { data } = await requestPhone({ variables: { input } });
          setProofs((p) => ({ ...p, phoneNote: noteFor(data?.requestVenueKitPhoneOtp, 'venueKit.form.phoneCodeSent', { phone }) }));
        }),
      verifyPhone: (phone, code) =>
        run('verifyPhone', async () => {
          const input = { phone_extension: VENUE_KIT_DIAL_CODE, phone_number: phone, code };
          const { data } = await verifyPhoneCode({ variables: { input } });
          setProofs((p) => ({ ...p, phoneToken: data?.verifyVenueKitPhoneOtp.token ?? null }));
        }),
      submit: ({ name, phone_number }) =>
        run('submit', async () => {
          const input = {
            name,
            email_token: proofs.emailToken ?? '',
            phone_extension: VENUE_KIT_DIAL_CODE,
            phone_number,
            ...(proofs.phoneToken ? { phone_token: proofs.phoneToken } : {}),
          };
          const { data } = await submitInterest({ variables: { input } });
          const updated = data?.submitVenueKitInterest.already_registered;
          notifySuccess(updated ? t('venueKit.form.doneUpdated') : t('venueKit.form.doneTitle'));
          setProofs(EMPTY);
          onRegistered();
        }),
      reset: () => setProofs(EMPTY),
    }),
    [run, noteFor, requestEmail, verifyEmailCode, requestPhone, verifyPhoneCode, submitInterest, proofs.emailToken, proofs.phoneToken, onRegistered, t]
  );

  return { state: { ...proofs, busy }, actions };
}
