import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { notifyError } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import type { MutationCrmVerifyEmailArgs, QueryCrmEmailStatusesArgs } from '@duncit/gql-types';
import {
  CRM_EMAIL_STATUSES,
  CRM_VERIFY_EMAIL,
  type CrmEmailStatusEntry,
  type CrmEmailVerification,
} from '../../api/emailVerification.gql';
import { createEmailStatusStore, type EmailStatusStore } from './emailStatusStore';

const EmailStatusContext = createContext<EmailStatusStore | null>(null);

/** Null outside the provider — badges then render nothing. */
export const useEmailStatusStore = (): EmailStatusStore | null => useContext(EmailStatusContext);

/**
 * Holds the CRM's email statuses for every page, so the same address shows the
 * same badge on a lead, its contacts and the compose dialog, and a check run in
 * one place updates them all.
 */
export function EmailStatusProvider({ children }: Readonly<{ children: ReactNode }>) {
  const client = useApolloClient();
  const store = useMemo(
    () =>
      createEmailStatusStore(
        async (emails) => {
          const { data } = await client.query<{ crmEmailStatuses: CrmEmailStatusEntry[] }, QueryCrmEmailStatusesArgs>({
            query: CRM_EMAIL_STATUSES,
            variables: { emails },
            fetchPolicy: 'network-only',
          });
          return data?.crmEmailStatuses ?? [];
        },
        async (email) => {
          try {
            const { data } = await client.mutate<{ crmVerifyEmail: CrmEmailVerification }, MutationCrmVerifyEmailArgs>({
              mutation: CRM_VERIFY_EMAIL,
              variables: { email },
            });
            return data?.crmVerifyEmail ?? null;
          } catch (error) {
            logs.portal.crm.warn('EmailStatusProvider', 'verify', { error });
            notifyError(parseApiError(error));
            return null;
          }
        },
        (error) => logs.portal.crm.warn('EmailStatusProvider', 'lookup', { error })
      ),
    [client]
  );
  return <EmailStatusContext.Provider value={store}>{children}</EmailStatusContext.Provider>;
}
