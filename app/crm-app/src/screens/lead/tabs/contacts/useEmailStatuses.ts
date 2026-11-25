import { useCallback, useEffect, useMemo, useState } from 'react';
import { fireAndForget, logs } from '@duncit/logs';

import { CrmAppVerifyEmailDocument } from '@/graphql/emailVerification';
import { CrmAppContactEmailStatusesDocument } from '@/graphql/leadTabs';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

const SCOPE = 'crm-app/useEmailStatuses';

/** What a badge shows; a null status means the lookup failed, so the badge shows nothing rather than guess. */
export interface EmailStatusEntry {
  status: string | null;
  checkedAt: string | null;
  suggestion: string;
  checking: boolean;
}

const NOT_CHECKED: EmailStatusEntry = {
  status: 'NOT_CHECKED',
  checkedAt: null,
  suggestion: '',
  checking: false,
};
const LOOKUP_FAILED: EmailStatusEntry = {
  status: null,
  checkedAt: null,
  suggestion: '',
  checking: false,
};

/** The portal's key for an address: trimmed, lower case. */
export const emailKey = (email: string): string => email.trim().toLowerCase();

/** One lookup for the batch; an address without a record is "Not checked", a failed lookup shows nothing. */
async function lookupStatuses(batch: readonly string[]): Promise<Record<string, EmailStatusEntry>> {
  try {
    const data = await gqlRequest(CrmAppContactEmailStatusesDocument, { emails: [...batch] });
    const found = new Map(
      data.crmEmailStatuses.map((row) => [
        emailKey(row.email),
        {
          status: row.status,
          checkedAt: row.checked_at,
          suggestion: row.suggestion,
          checking: false,
        },
      ]),
    );
    return Object.fromEntries(batch.map((email) => [email, found.get(email) ?? NOT_CHECKED]));
  } catch (err) {
    logs.mobileApp.warn(SCOPE, 'lookup', { error: errorMessage(err, 'lookup failed') });
    return Object.fromEntries(batch.map((email) => [email, LOOKUP_FAILED]));
  }
}

export interface EmailStatuses {
  get: (email: string) => EmailStatusEntry | undefined;
  /** Check an address now (the portal's badge click); the badge spins, then shows the new verdict. */
  verify: (email: string) => Promise<void>;
  /** Why the last check failed, worded for the reader. */
  error: string | null;
}

/**
 * The verification status of every address on screen, in one lookup — the
 * portal's email status store for one screen of the app.
 */
export function useEmailStatuses(emails: readonly string[]): EmailStatuses {
  const { t } = useTranslation();
  const key = useMemo(
    () => [...new Set(emails.map(emailKey).filter(Boolean))].join('\n'),
    [emails],
  );
  const [entries, setEntries] = useState<Record<string, EmailStatusEntry>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    const load = async () => {
      const update = await lookupStatuses(key.split('\n'));
      if (alive) setEntries((prev) => ({ ...prev, ...update }));
    };
    fireAndForget(load(), logs.mobileApp, SCOPE, 'load');
    return () => {
      alive = false;
    };
  }, [key]);

  const verify = useCallback(
    async (email: string) => {
      const id = emailKey(email);
      const mark = (checking: boolean) =>
        setEntries((prev) => ({ ...prev, [id]: { ...(prev[id] ?? NOT_CHECKED), checking } }));
      mark(true);
      setError(null);
      try {
        const { crmVerifyEmail: result } = await gqlRequest(CrmAppVerifyEmailDocument, {
          email: email.trim(),
        });
        setEntries((prev) => ({
          ...prev,
          [id]: {
            status: result.status,
            checkedAt: result.created_at,
            suggestion: result.suggestion,
            checking: false,
          },
        }));
      } catch (err) {
        mark(false);
        setError(errorMessage(err, t('crmApp.emailVerifier.failed')));
      }
    },
    [t],
  );

  const get = useCallback((email: string) => entries[emailKey(email)], [entries]);
  return { get, verify, error };
}
