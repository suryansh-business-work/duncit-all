import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { firstGraphQLError, parseApiError } from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';
import { useShellRuntime } from '../lib/runtime';
import { PORTAL_SECURITY_CHALLENGE, SUBMIT_PORTAL_SECURITY_VERIFICATION } from './documents';
import { useAlternativeVerification } from './useAlternativeVerification';
import { useGeolocation } from './useGeolocation';

export const CONSENT_KEYS = [
  'authorized_person',
  'credentials_not_shared',
  'policies_acknowledged',
  'location_consent',
] as const;
export type ConsentKey = (typeof CONSENT_KEYS)[number];
export type ConsentState = Record<ConsentKey, boolean>;

/** Every box starts unticked: consent is an act, never a default. */
const NO_CONSENT: ConsentState = {
  authorized_person: false,
  credentials_not_shared: false,
  policies_acknowledged: false,
  location_consent: false,
};

export const POLICY_CHANGED = 'POLICY_CHANGED';

interface Options {
  /** What to do once the new token is stored. Defaults to a reload at the same address. */
  onVerified?: () => void;
}

/** The new session token takes effect on a fresh page load: sockets, cache and `me` all start clean. */
const reloadHere = () => globalThis.location.reload();

/** What the browser says about itself — shown to the reviewer beside what the server saw. */
function clientFacts() {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    language: nav.language || null,
    platform: nav.userAgentData?.platform ?? null,
  };
}

/**
 * Everything the Security Verification screen does: load what to show, hold the
 * four acknowledgements, take a location fix, and send the lot.
 *
 * The button is allowed only when the three acknowledgements hold AND there is
 * either a fix plus the location consent, or an administrator-approved
 * alternative. The server checks the same rules; this is what keeps the person
 * from pressing a button that cannot work.
 */
export function useSecurityVerification({ onVerified = reloadHere }: Readonly<Options> = {}) {
  const runtime = useShellRuntime();
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(PORTAL_SECURITY_CHALLENGE, { fetchPolicy: 'network-only' });
  const [submitMutation, { loading: submitting }] = useMutation(SUBMIT_PORTAL_SECURITY_VERIFICATION);
  const [consent, setConsentState] = useState<ConsentState>(NO_CONSENT);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const geo = useGeolocation();

  const challenge = data?.portalSecurityChallenge ?? null;
  const alternative = useAlternativeVerification(challenge?.exception ?? null, geo.status);
  // An administrator-approved alternative stands in for the location.
  const approved = alternative.exception?.status === 'APPROVED' ? alternative.exception : null;
  const usingException = approved !== null;

  const setConsent = (key: ConsentKey, value: boolean) => setConsentState((current) => ({ ...current, [key]: value }));

  const acknowledged = consent.authorized_person && consent.credentials_not_shared && consent.policies_acknowledged;
  const locationReady = usingException || (geo.status === 'granted' && geo.fix !== null && consent.location_consent);
  const canProceed = challenge !== null && !submitting && acknowledged && locationReady;

  const blockers = useMemo(
    () => ({ acknowledgements: !acknowledged, location: !locationReady }),
    [acknowledged, locationReady],
  );

  const submit = async () => {
    if (!challenge || !canProceed || !runtime) return;
    setSubmitError(null);
    // With an approved alternative no location is sent, even if one was taken.
    const fix = approved ? null : geo.fix;
    try {
      const res = await submitMutation({
        variables: {
          input: {
            policy_version: challenge.policy_version,
            consent,
            location: fix ? { latitude: fix.latitude, longitude: fix.longitude, accuracy_meters: fix.accuracy } : null,
            exception_id: approved ? approved.id : null,
            client: clientFacts(),
          },
        },
      });
      const token = res.data?.submitPortalSecurityVerification.token;
      if (!token) throw new Error(t('shell.securityVerification.noSession'));
      globalThis.localStorage.setItem(runtime.tokenKey, token);
      onVerified();
    } catch (failure) {
      if (firstGraphQLError(failure)?.extensions?.code === POLICY_CHANGED) {
        // The wording moved under them: show the new one, and ask again.
        setConsentState(NO_CONSENT);
        await refetch();
      }
      setSubmitError(parseApiError(failure));
    }
  };

  return {
    challenge,
    loading,
    loadError: error ? parseApiError(error) : null,
    reload: () => refetch(),
    consent,
    setConsent,
    geo,
    alternative,
    usingException,
    blockers,
    canProceed,
    submitting,
    submitError,
    submit,
  };
}
