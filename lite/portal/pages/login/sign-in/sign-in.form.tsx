import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { LITE_REQUEST_SIGN_IN_CODE, LITE_VERIFY_SIGN_IN_CODE } from '../../../../shared/graphql/documents';
import { usePortalT } from '../../../../shared/i18n';
import { useLiteSession } from '../../../../shared/session';
import { CodeStep } from './CodeStep';
import { EmailStep } from './EmailStep';
import type { SignInRequest } from './sign-in.types';

interface Step {
  email: string;
  request: SignInRequest;
}

/** Email → code → session. The session provider takes over once the token is stored. */
export function SignInForm() {
  const { t } = usePortalT();
  const { completeSignIn } = useLiteSession();
  const [requestCode, requestState] = useMutation<{ liteRequestSignInCode: SignInRequest }>(LITE_REQUEST_SIGN_IN_CODE);
  const [verifyCode, verifyState] = useMutation<{ liteVerifySignInCode: { token: string } }>(LITE_VERIFY_SIGN_IN_CODE);
  const [step, setStep] = useState<Step | null>(null);

  const request = async (email: string) => {
    try {
      const { data } = await requestCode({ variables: { email } });
      const result = data?.liteRequestSignInCode;
      if (!result) return;
      setStep({ email, request: result });
      notifySuccess(t('litePortal.login.codeSent'));
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  const verify = async (code: string) => {
    if (!step) return;
    try {
      const { data } = await verifyCode({ variables: { email: step.email, code } });
      const token = data?.liteVerifySignInCode.token;
      if (token) await completeSignIn(token);
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  if (!step) return <EmailStep busy={requestState.loading} onSubmit={request} />;
  return (
    <CodeStep
      email={step.email}
      request={step.request}
      busy={verifyState.loading}
      resending={requestState.loading}
      onSubmit={verify}
      onResend={() => request(step.email)}
      onChangeEmail={() => setStep(null)}
    />
  );
}
