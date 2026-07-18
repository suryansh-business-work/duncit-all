import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import AuthBackground from '../../components/AuthBackground';
import { type ForgotPasswordValues } from '../../forms/forgot-password';
import { parseApiError } from '../../utils/parseApiError';
import { REQUEST_PASSWORD_RESET_OTP } from './queries';
import ForgotPasswordCard from './ForgotPasswordCard';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [requestOtp, { loading, error }] = useMutation(REQUEST_PASSWORD_RESET_OTP);
  const [unregistered, setUnregistered] = useState(false);

  const handleSubmit = async (values: ForgotPasswordValues) => {
    setUnregistered(false);
    try {
      const res = await requestOtp({ variables: { email: values.email } });
      // An unregistered email gets no OTP — flag the field + Create-Account CTA
      // instead of moving the visitor to the reset step.
      if (res.data?.requestPasswordResetOtp?.registered === false) {
        setUnregistered(true);
        return;
      }
      navigate(`/reset-password?email=${encodeURIComponent(values.email)}`);
    } catch (e) {
      throw new Error(parseApiError(e));
    }
  };

  return (
    <AuthBackground>
      <ForgotPasswordCard
        loading={loading}
        errorMessage={error ? parseApiError(error) : null}
        unregistered={unregistered}
        onSubmit={handleSubmit}
      />
    </AuthBackground>
  );
}
