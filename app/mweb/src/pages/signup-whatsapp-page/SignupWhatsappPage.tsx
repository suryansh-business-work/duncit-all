import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
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
  whatsAppOtpRequestSchema,
  whatsAppOtpVerifySchema,
} from '../../validators/auth';
import { REQUEST_OTP, SKIP, VERIFY_OTP } from './queries';
import RequestForm from './RequestForm';
import VerifyForm from './VerifyForm';

export default function SignupWhatsappPage() {
  const navigate = useNavigate();
  const [requestOtp, requestState] = useMutation(REQUEST_OTP);
  const [verifyOtp, verifyState] = useMutation(VERIFY_OTP);
  const [skip] = useMutation(SKIP);
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestForm = useFormik({
    initialValues: { phone_extension: '+91', phone_number: '' },
    validationSchema: whatsAppOtpRequestSchema,
    onSubmit: async (values) => {
      setError(null);
      try {
        const res = await requestOtp({
          variables: { ext: values.phone_extension, num: values.phone_number },
        });
        setDevOtp(res.data?.requestWhatsAppOtp?.dev_otp ?? null);
        setStep('verify');
      } catch (e: any) {
        setError(e.message ?? 'Could not send OTP');
      }
    },
  });

  const verifyForm = useFormik({
    initialValues: { otp: '' },
    validationSchema: whatsAppOtpVerifySchema,
    onSubmit: async (values) => {
      setError(null);
      try {
        await verifyOtp({
          variables: {
            ext: requestForm.values.phone_extension,
            num: requestForm.values.phone_number,
            otp: values.otp,
          },
        });
        navigate('/signup-survey');
      } catch (e: any) {
        setError(e.message ?? 'Invalid OTP');
      }
    },
  });

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
              <RequestForm form={requestForm} loading={requestState.loading} onSkip={onSkip} />
            ) : (
              <VerifyForm
                form={verifyForm}
                loading={verifyState.loading}
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
