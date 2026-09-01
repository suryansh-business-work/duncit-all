import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { ACCEPTANCE_SURFACE } from '../components/policy-acceptance';
import { useTranslation } from '../i18n/useTranslation';
import { parseApiError } from '../utils/parseApiError';

const SIGNUP_GOOGLE = gql`
  mutation SignupWithGoogle($input: GoogleSignupInput!) {
    signupWithGoogle(input: $input) {
      token
      user {
        user_id
        email
        onboarding_survey_completed
      }
    }
  }
`;

/**
 * Google signup, held open across the policy gate.
 *
 * `signupWithGoogle` is new-account-only, so the credential Google returns is
 * kept here — unspent — while the acceptance dialog runs, and the mutation is
 * called exactly once, with the accepted ids. There is no post-signup screen to
 * add because at that point there is still no account: backing out leaves
 * nothing behind, which is what the dialog's Google wording promises.
 *
 * `linkedCode` is a referral code that arrived on the URL; it rides through to
 * the referral step so somebody who followed a friend's link and then chose
 * Google still lands with the box filled in.
 */
export function useGoogleSignup(linkedCode: string) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [signupGoogle, { loading }] = useMutation<any>(SIGNUP_GOOGLE);
  const [credential, setCredential] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = (idToken: string) => {
    setError(null);
    setCredential(idToken);
  };

  const create = async (idToken: string, acceptedPolicyIds: string[]) => {
    const res = await signupGoogle({
      variables: {
        input: {
          id_token: idToken,
          accepted_policy_ids: acceptedPolicyIds,
          accepted_policy_surface: ACCEPTANCE_SURFACE,
        },
      },
    });
    const token = res.data?.signupWithGoogle?.token;
    if (token) {
      localStorage.setItem('token', token);
      navigate('/signup-referral', { state: { code: linkedCode } });
    }
  };

  const accept = (acceptedPolicyIds: string[]) => {
    const idToken = credential;
    setCredential(null);
    if (!idToken) return;
    create(idToken, acceptedPolicyIds).catch((e) => setError(parseApiError(e)));
  };

  // Backing out drops the credential: they can press Google again, and until
  // every policy is accepted there is nothing to create.
  const cancel = () => {
    setCredential(null);
    setError(t('policyAcceptance.mustAcceptHint'));
  };

  return { credential, error, loading, start, accept, cancel };
}
