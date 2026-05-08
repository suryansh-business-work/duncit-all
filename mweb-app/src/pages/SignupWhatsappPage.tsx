import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  whatsAppOtpRequestSchema,
  whatsAppOtpVerifySchema,
} from '../validators/auth';

const REQUEST_OTP = gql`
  mutation RequestWhatsAppOtp($ext: String!, $num: String!) {
    requestWhatsAppOtp(phone_extension: $ext, phone_number: $num) {
      ok
      dev_otp
    }
  }
`;
const VERIFY_OTP = gql`
  mutation VerifyWhatsAppOtp($ext: String!, $num: String!, $otp: String!) {
    verifyWhatsAppOtp(phone_extension: $ext, phone_number: $num, otp: $otp) {
      user_id
      whatsapp_number
    }
  }
`;
const SKIP = gql`
  mutation SkipWhatsAppOtp {
    skipWhatsAppOtp {
      user_id
    }
  }
`;

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
                WhatsApp number profile karne se hum aapko notifications de
                paayenge aur aap community + groups join kar sakte hai. Aap baad
                me bhi update kar sakte hai.
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
            {devOtp && step === 'verify' && (
              <Alert severity="info">
                Dev OTP: <strong>{devOtp}</strong>
              </Alert>
            )}

            {step === 'request' ? (
              <form onSubmit={requestForm.handleSubmit} noValidate>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    label="Code"
                    name="phone_extension"
                    value={requestForm.values.phone_extension}
                    onChange={requestForm.handleChange}
                    onBlur={requestForm.handleBlur}
                    error={
                      requestForm.touched.phone_extension &&
                      Boolean(requestForm.errors.phone_extension)
                    }
                    helperText={
                      requestForm.touched.phone_extension &&
                      requestForm.errors.phone_extension
                    }
                    sx={{ width: 100 }}
                    size="small"
                  />
                  <TextField
                    label="WhatsApp number"
                    name="phone_number"
                    value={requestForm.values.phone_number}
                    onChange={requestForm.handleChange}
                    onBlur={requestForm.handleBlur}
                    error={
                      requestForm.touched.phone_number &&
                      Boolean(requestForm.errors.phone_number)
                    }
                    helperText={
                      requestForm.touched.phone_number &&
                      requestForm.errors.phone_number
                    }
                    fullWidth
                    size="small"
                  />
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={requestState.loading}
                  >
                    Send OTP
                  </Button>
                  <Button onClick={onSkip} variant="text">
                    Skip
                  </Button>
                </Stack>
              </form>
            ) : (
              <form onSubmit={verifyForm.handleSubmit} noValidate>
                <TextField
                  label="Enter OTP"
                  name="otp"
                  value={verifyForm.values.otp}
                  onChange={verifyForm.handleChange}
                  onBlur={verifyForm.handleBlur}
                  error={verifyForm.touched.otp && Boolean(verifyForm.errors.otp)}
                  helperText={verifyForm.touched.otp && verifyForm.errors.otp}
                  fullWidth
                  size="small"
                  inputProps={{ inputMode: 'numeric', maxLength: 8 }}
                />
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={verifyState.loading}
                  >
                    Verify & continue
                  </Button>
                  <Button onClick={() => setStep('request')} variant="text">
                    Change number
                  </Button>
                </Stack>
                <Button onClick={onSkip} fullWidth sx={{ mt: 1 }}>
                  Skip for now
                </Button>
              </form>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
