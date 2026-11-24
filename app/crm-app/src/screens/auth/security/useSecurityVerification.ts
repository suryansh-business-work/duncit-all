import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { fireAndForget, logs } from '@duncit/logs';

import {
  CrmAppRequestSecurityExceptionDocument,
  CrmAppSecurityChallengeDocument,
  CrmAppSubmitSecurityDocument,
} from '@/graphql/auth';
import { gqlRequest } from '@/services/graphql.client';
import { getToken } from '@/services/session';
import { useAuthStore } from '@/stores/auth.store';
import { errorCode, errorMessage } from '@/utils/errors';
import { useTranslation } from '@/hooks/useTranslation';

export type Challenge = NonNullable<ResultOf<typeof CrmAppSecurityChallengeDocument>['portalSecurityChallenge']>;
export type ConsentKey = 'authorized_person' | 'credentials_not_shared' | 'policies_acknowledged' | 'location_consent';
export type Consent = Record<ConsentKey, boolean>;
type Fix = { latitude: number; longitude: number; accuracy_meters: number };
/** How a failed location request is reported to the server (its LOCATION_ERROR_CODES). */
type LocationErrorCode = 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE';

export const NO_CONSENT: Consent = {
  authorized_person: false,
  credentials_not_shared: false,
  policies_acknowledged: false,
  location_consent: false,
};

/** What blocks Proceed — the portal's own two rules. */
export function blockers(consent: Consent, fix: Fix | null, approvedException: boolean) {
  const acknowledged = consent.authorized_person && consent.credentials_not_shared && consent.policies_acknowledged;
  const location = approvedException || (fix !== null && consent.location_consent);
  return { acknowledgements: !acknowledged, location: !location };
}

/**
 * The Security Verification step every console sign-in owes — the same
 * challenge, consents, location and administrator alternative as the portal's
 * screen, through the same mutations; the new token replaces the pending one.
 */
export function useSecurityVerification() {
  const { t } = useTranslation();
  const completeSecurity = useAuthStore((s) => s.completeSecurity);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [consent, setConsent] = useState<Consent>(NO_CONSENT);
  const [fix, setFix] = useState<Fix | null>(null);
  const [locationError, setLocationError] = useState<LocationErrorCode | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const authed = async () => ({ token: (await getToken()) ?? undefined });

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await gqlRequest(CrmAppSecurityChallengeDocument, undefined, await authed());
      setChallenge(data.portalSecurityChallenge);
    } catch (error) {
      setLoadError(errorMessage(error, t('shell.securityVerification.loadFailed')));
    }
  }, [t]);

  useEffect(() => {
    fireAndForget(load(), logs.mobileApp, 'crm-app/useSecurityVerification', 'load');
  }, [load]);

  const shareLocation = async () => {
    setLocationError(null);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return setLocationError('PERMISSION_DENIED');
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setFix({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy_meters: pos.coords.accuracy ?? 0 });
    } catch {
      setLocationError('POSITION_UNAVAILABLE');
    }
  };

  const approved = challenge?.exception?.status === 'APPROVED' ? challenge.exception : null;
  const blocked = blockers(consent, fix, approved !== null);
  const canProceed = challenge !== null && !submitting && !blocked.acknowledgements && !blocked.location;

  const submit = async () => {
    if (!challenge || !canProceed) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { submitPortalSecurityVerification } = await gqlRequest(
        CrmAppSubmitSecurityDocument,
        {
          input: {
            policy_version: challenge.policy_version,
            consent,
            location: approved ? null : fix,
            exception_id: approved?.id ?? null,
            client: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: null, platform: Platform.OS },
          },
        },
        await authed(),
      );
      await completeSecurity(submitPortalSecurityVerification.token);
    } catch (error) {
      // The wording changed under them: show the new policy and ask again.
      if (errorCode(error) === 'POLICY_CHANGED') {
        setConsent(NO_CONSENT);
        await load();
      }
      setSubmitError(errorMessage(error, t('shell.securityVerification.noSession')));
    } finally {
      setSubmitting(false);
    }
  };

  const requestAlternative = async (reason: string) => {
    const { requestPortalSecurityException } = await gqlRequest(
      CrmAppRequestSecurityExceptionDocument,
      { input: { reason, location_error: locationError } },
      await authed(),
    );
    setChallenge((c) => (c ? { ...c, exception: requestPortalSecurityException } : c));
  };

  return { challenge, loadError, load, consent, setConsent, fix, locationError, shareLocation, blocked, canProceed, submitting, submitError, submit, requestAlternative, approved };
}
