import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import {
  WhatsAppRequestForm,
  WhatsAppVerifyForm,
  whatsAppOtpRequestDefaults,
  type WhatsAppOtpRequestValues,
  type WhatsAppOtpVerifyValues,
} from '../../forms/whatsapp-otp';
import { REQUEST_OTP, SKIP, VERIFY_OTP } from './queries';

export default function SignupWhatsappPage() {
  const navigate = useNavigate();
  const [requestOtp, requestState] = useMutation(REQUEST_OTP);
  const [verifyOtp, verifyState] = useMutation(VERIFY_OTP);
  const [skip] = useMutation(SKIP);
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState<WhatsAppOtpRequestValues>(whatsAppOtpRequestDefaults);

  const onRequest = async (values: WhatsAppOtpRequestValues) => {
    setError(null);
    try {
      const res = await requestOtp({
        variables: { ext: values.phone_extension, num: values.phone_number },
      });
      setRequested(values);
      setDevOtp(res.data?.requestWhatsAppOtp?.dev_otp ?? null);
      setStep('verify');
    } catch (e: any) {
      setError(e.message ?? 'Could not send OTP');
    }
  };

  const onVerify = async (values: WhatsAppOtpVerifyValues) => {
    setError(null);
    try {
      await verifyOtp({
        variables: {
          ext: requested.phone_extension,
          num: requested.phone_number,
          otp: values.otp,
        },
      });
      navigate('/signup-survey');
    } catch (e: any) {
      setError(e.message ?? 'Invalid OTP');
    }
  };

  const onSkip = async () => {
    try {
      await skip();
    } catch {
      /* ignore */
    }
    navigate('/signup-survey');
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Add your WhatsApp number
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Add your WhatsApp number to receive pod notifications and join community
                groups. You can always update this later from your profile settings.
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
            {devOtp && step === 'verify' && (
              <Alert severity="info">
                Dev OTP: <strong>{devOtp}</strong>
              </Alert>
            )}

            {step === 'request' ? (
              <WhatsAppRequestForm
                loading={requestState.loading}
                onSubmit={onRequest}
                onSkip={onSkip}
              />
            ) : (
              <WhatsAppVerifyForm
                loading={verifyState.loading}
                onSubmit={onVerify}
                onChangeNumber={() => setStep('request')}
                onSkip={onSkip}
              />
            )}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
