import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useSearchParams } from 'react-router-dom';
import AuthBackground from '../../components/AuthBackground';
import { type ResetPasswordValues } from '../../forms/reset-password';
import { parseApiError } from '../../utils/parseApiError';
import { REQUEST_PASSWORD_RESET_OTP, RESET_PASSWORD_WITH_OTP } from '../forgot-password-page/queries';
import ResetPasswordCard from './ResetPasswordCard';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const [resetPassword, { loading, error }] = useMutation(RESET_PASSWORD_WITH_OTP);
  const [requestOtp, { loading: resending }] = useMutation(REQUEST_PASSWORD_RESET_OTP);
  const [done, setDone] = useState(false);

  const handleSubmit = async (values: ResetPasswordValues) => {
    try {
      await resetPassword({
        variables: { input: { email, otp: values.otp, new_password: values.new_password } },
      });
      setDone(true);
    } catch (e) {
      throw new Error(parseApiError(e));
    }
  };

  const handleResend = () => {
    if (!email) return;
    void requestOtp({ variables: { email } });
  };

  return (
    <AuthBackground>
      <ResetPasswordCard
        email={email}
        loading={loading}
        errorMessage={error ? parseApiError(error) : null}
        done={done}
        resending={resending}
        onSubmit={handleSubmit}
        onResend={handleResend}
      />
    </AuthBackground>
  );
}
