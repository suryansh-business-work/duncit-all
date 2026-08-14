import { useEffect, useState } from 'react';
import PolicyAcceptanceDialog from './PolicyAcceptanceDialog';
import { isEveryPolicyAccepted } from './acceptance';
import type { SignupPolicy } from './useSignupPolicies';

interface Props {
  /** The Google id_token waiting on acceptance, or null when nothing is pending. */
  credential: string | null;
  policies: readonly SignupPolicy[];
  loading: boolean;
  failed: boolean;
  /** Every policy accepted — create the account now. */
  onAccepted: (ids: string[]) => void;
  /** Closed without accepting everything. Nothing was created. */
  onCancelled: () => void;
}

/**
 * The same dialog, run after Google returns and before the account exists.
 *
 * `signupWithGoogle` is new-account-only, so there is nothing to gate afterwards
 * and no post-signup screen to add: the credential is held here until every
 * policy is accepted, and the mutation is called once, with the ids.
 */
export default function GoogleSignupPolicyGate({
  credential,
  policies,
  loading,
  failed,
  onAccepted,
  onCancelled,
}: Readonly<Props>) {
  const [accepted, setAccepted] = useState<string[]>([]);

  // A second Google attempt starts from zero — the earlier ticks belong to a
  // credential that never became an account.
  useEffect(() => {
    if (credential) setAccepted([]);
  }, [credential]);

  const handleClose = (ids: string[]) => {
    // An unresolved list is an empty list, and "accepted everything" would then
    // be vacuously true — so the account is only created once the list is real.
    if (!loading && !failed && isEveryPolicyAccepted(policies, ids)) {
      onAccepted(ids);
      return;
    }
    onCancelled();
  };

  return (
    <PolicyAcceptanceDialog
      open={!!credential}
      afterGoogle
      policies={policies}
      loading={loading}
      failed={failed}
      accepted={accepted}
      onChange={setAccepted}
      onClose={handleClose}
    />
  );
}
