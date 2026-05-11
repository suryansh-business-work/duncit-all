import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface InterviewSuccessCardProps {
  submittedRef: string;
}

export default function InterviewSuccessCard({ submittedRef }: InterviewSuccessCardProps) {
  const navigate = useNavigate();
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Card>
        <CardContent>
          <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 64 }} />
            <Typography variant="h5" fontWeight={700} textAlign="center">
              Application received!
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              We've emailed you a confirmation. Our team will review your request and confirm one
              of your preferred meeting slots shortly.
            </Typography>
            <Chip label={`Reference · ${submittedRef.slice(-8)}`} variant="outlined" />
            <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
              <Button variant="outlined" onClick={() => navigate('/')}>
                Back to home
              </Button>
              <Button variant="contained" onClick={() => navigate('/profile')}>
                My profile
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
