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

  const handleSubmit = async (values: ForgotPasswordValues) => {
    try {
      await requestOtp({ variables: { email: values.email } });
      // The server always returns ok (no email enumeration); move the user to the
      // reset step with the email prefilled via the query string.
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
        onSubmit={handleSubmit}
      />
    </AuthBackground>
  );
}
