import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import type { PortalSecurityExceptionDecisionInput } from '@duncit/gql-types';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/app-settings';
import { firstGraphQLError } from '@duncit/utils';
import { DECIDE_PORTAL_SECURITY_EXCEPTION } from './queries';

/**
 * The refusals the server gives for a decision, each of which settles the
 * request one way or another: it was already decided (CONFLICT), it is the
 * reviewer's own or their role is gone (FORBIDDEN), or it no longer exists
 * (NOT_FOUND). Written out whole for the shipped-key gate.
 */
const REFUSAL_KEY: Readonly<Record<string, string>> = {
  CONFLICT: 'tech.verificationRequests.conflict',
  FORBIDDEN: 'tech.verificationRequests.forbidden',
  NOT_FOUND: 'tech.verificationRequests.notFound',
};

/**
 * Approve or reject one request, and say what happened.
 *
 * `onSettled` runs when the dialog has nothing left to do: after a decision, and
 * after a refusal that shows the list was stale (someone else decided first).
 * Any other failure — a dropped connection — leaves the dialog open so the
 * reviewer can try again with what they typed.
 */
export function useDecideRequest(onSettled: () => void) {
  const { t } = useTranslation();
  const [mutate, { loading }] = useMutation(DECIDE_PORTAL_SECURITY_EXCEPTION);

  const decide = useCallback(
    async (input: PortalSecurityExceptionDecisionInput) => {
      try {
        await mutate({ variables: { input } });
        notifySuccess(input.approve ? t('tech.verificationRequests.approved') : t('tech.verificationRequests.rejected'));
        onSettled();
      } catch (error) {
        const code = firstGraphQLError(error)?.extensions?.code;
        logs.portal.tech.error('VerificationRequests', 'decide', { error, code, request_id: input.id });
        const key = typeof code === 'string' ? REFUSAL_KEY[code] : undefined;
        if (key) {
          notifyError(t(key));
          onSettled();
          return;
        }
        notifyError(t('tech.verificationRequests.failed'));
      }
    },
    [mutate, onSettled, t],
  );

  return { decide, busy: loading };
}
