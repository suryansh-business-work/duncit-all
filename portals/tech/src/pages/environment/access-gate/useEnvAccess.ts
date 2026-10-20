import { useCallback, useEffect, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import type { EnvAccessStatus } from '@duncit/gql-types';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/app-settings';
import { ENV_ACCESS_STATUS, LOCK_ENV_ACCESS, REQUEST_ENV_ACCESS_CODE, VERIFY_ENV_ACCESS_CODE } from './access-queries';
import type { PendingCode } from './env-access.types';

/** Every root field that can hold a key or a secret — dropped from the cache when the session locks. */
const SECRET_FIELDS = [
  'envEntries',
  'envEntriesTable',
  'envEntry',
  'envEntriesForPortal',
  'envOverview',
  'envTestHistory',
  'envTestAttempts',
];

/** The emailed-code unlock for Environment Variables: status, send, verify, lock and auto re-lock. */
export function useEnvAccess() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [pending, setPending] = useState<PendingCode | null>(null);
  const status = useQuery(ENV_ACCESS_STATUS, { fetchPolicy: 'network-only' });
  const [requestCode, requestState] = useMutation(REQUEST_ENV_ACCESS_CODE);
  const [verifyCode, verifyState] = useMutation(VERIFY_ENV_ACCESS_CODE);
  const [lockAccess, lockState] = useMutation(LOCK_ENV_ACCESS);

  const access = status.data?.envAccessStatus;
  const { refetch } = status;

  // The error state re-renders from the query itself; the log is for us.
  const retry = useCallback(() => {
    refetch().catch((err: unknown) => {
      logs.portal.tech.error('envAccess', 'retry', { msg: 'status refetch failed', reason: parseApiError(err) });
    });
  }, [refetch]);

  const apply = useCallback(
    (next: EnvAccessStatus) => {
      client.writeQuery({ query: ENV_ACCESS_STATUS, data: { envAccessStatus: next } });
      if (next.unlocked) return;
      for (const fieldName of SECRET_FIELDS) client.cache.evict({ id: 'ROOT_QUERY', fieldName });
      client.cache.gc();
    },
    [client]
  );

  // The server ends the unlock on its own clock; this one only mirrors it.
  useEffect(() => {
    if (!access?.unlocked || !access.expires_at) return undefined;
    const wait = Math.max(0, new Date(access.expires_at).getTime() - Date.now());
    const timer = globalThis.setTimeout(() => {
      refetch()
        .then(({ data }) => {
          if (data) apply(data.envAccessStatus);
        })
        .catch((err: unknown) => {
          logs.portal.tech.error('envAccess', 'relock', { msg: 'status refetch failed', reason: parseApiError(err) });
        });
    }, wait);
    return () => globalThis.clearTimeout(timer);
  }, [access?.unlocked, access?.expires_at, apply, refetch]);

  const send = useCallback(async () => {
    try {
      const { data } = await requestCode();
      const issued = data?.requestEnvAccessCode;
      if (!issued) return;
      setPending({
        challengeId: issued.challenge_id,
        expiresAt: issued.expires_at,
        sentTo: issued.sent_to,
        resendAt: Date.now() + issued.resend_after_seconds * 1000,
      });
      notifySuccess(t('tech.environment.accessSent', { vars: { email: issued.sent_to } }));
    } catch (err) {
      notifyError(parseApiError(err));
    }
  }, [requestCode, t]);

  const verify = useCallback(
    async (code: string) => {
      if (!pending) return;
      try {
        const { data } = await verifyCode({ variables: { challengeId: pending.challengeId, code } });
        if (!data) return;
        setPending(null);
        apply(data.verifyEnvAccessCode);
      } catch (err) {
        notifyError(parseApiError(err));
      }
    },
    [apply, pending, verifyCode]
  );

  const lock = useCallback(async () => {
    try {
      const { data } = await lockAccess();
      if (data) apply(data.lockEnvAccess);
      notifySuccess(t('tech.environment.accessLocked'));
    } catch (err) {
      notifyError(parseApiError(err));
    }
  }, [apply, lockAccess, t]);

  return {
    access,
    loading: status.loading && !status.data,
    error: status.error,
    retry,
    pending,
    sending: requestState.loading,
    verifying: verifyState.loading,
    locking: lockState.loading,
    send,
    verify,
    lock,
  };
}
