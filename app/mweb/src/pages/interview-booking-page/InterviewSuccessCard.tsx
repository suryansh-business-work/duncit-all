import { useNavigate } from 'react-router';
import { Box, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { DuncitButton } from '@duncit/buttons';

interface InterviewSuccessCardProps {
  submittedRef: string;
}

/** The calm "done" card: a success mark on its tonal disc, one line, the
 * reference and the two ways on. */
export default function InterviewSuccessCard({ submittedRef }: Readonly<InterviewSuccessCardProps>) {
  const navigate = useNavigate();
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Card>
        <CardContent>
          <Stack
            spacing={2}
            sx={{
              alignItems: "center",
              py: 3
            }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: 'success.main',
                bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
              }}
            >
              <CheckCircleRoundedIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography
              variant="h6"
              component="h1"
              sx={{
                fontSize: '1.25rem',
                textAlign: "center"
              }}>
              Application received!
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              We've emailed you a confirmation. Our team will review your request and confirm one
              of your preferred meeting slots shortly.
            </Typography>
            <Chip label={`Reference · ${submittedRef.slice(-8)}`} variant="outlined" />
            <Stack direction="row" spacing={1.5} sx={{ pt: 1, width: '100%' }}>
              <DuncitButton variant="outlined" size="large" fullWidth onClick={() => navigate('/')}>
                Back to home
              </DuncitButton>
              <DuncitButton variant="contained" size="large" fullWidth onClick={() => navigate('/profile')}>
                My profile
              </DuncitButton>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
