import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { parseApiError } from '@duncit/utils';
import {
  PORTAL_SECURITY_EXCEPTION,
  REQUEST_PORTAL_SECURITY_EXCEPTION,
  type ExceptionStatus,
} from './documents';
import { locationErrorFor, type GeolocationStatus } from './useGeolocation';

/** How often a waiting request is looked at again, so approval shows without a reload. */
const POLL_MS = 10_000;

/**
 * The way through when the person cannot or will not share a location: they say
 * why, an administrator decides, and an approval lets them verify without one.
 * Declining never silently opens the console — the request is recorded, and
 * waits.
 */
export function useAlternativeVerification(initial: ExceptionStatus | null, locationStatus: GeolocationStatus) {
  const [requested, setRequested] = useState<ExceptionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const known = requested ?? initial;
  const [requestMutation, { loading: requesting }] = useMutation(REQUEST_PORTAL_SECURITY_EXCEPTION);

  const waiting = known?.status === 'PENDING';
  const { data } = useQuery(PORTAL_SECURITY_EXCEPTION, {
    skip: !waiting,
    pollInterval: waiting ? POLL_MS : 0,
    fetchPolicy: 'network-only',
  });
  // The polled answer wins only for the request it is about: after a rejection
  // the person may ask again, and the old answer must not hide the new request.
  const polled = data?.portalSecurityException;
  const exception = polled && polled.id === known?.id ? polled : known;

  const request = async (reason: string) => {
    setError(null);
    try {
      const res = await requestMutation({
        variables: { input: { reason, location_error: locationErrorFor(locationStatus) } },
      });
      setRequested(res.data?.requestPortalSecurityException ?? null);
    } catch (error_) {
      setError(parseApiError(error_));
      throw error_;
    }
  };

  return { exception, request, requesting, error };
}
