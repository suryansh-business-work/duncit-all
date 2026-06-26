import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

/** Post-submit confirmation for a Host Request — mirrors the native success screen. */
export default function SuccessScreen() {
  const navigate = useNavigate();
  return (
    <Stack spacing={2.5} alignItems="center" sx={{ textAlign: 'center', py: 2 }}>
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: 'common.white',
          background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)',
        }}
      >
        <CheckCircleRoundedIcon sx={{ fontSize: 40 }} />
      </Box>
      <Typography variant="h6" fontWeight={950}>
        Your Request Has Been Submitted
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440 }}>
        Thank you for expanding your hosting journey with Duncit. Our onboarding team will review
        your request for the new category and get in touch with you shortly. You&apos;ll receive
        updates through Notifications and Email.
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={() => navigate('/host/manage')}
        sx={{ borderRadius: 999, fontWeight: 900, px: 4 }}
      >
        Okay
      </Button>
    </Stack>
  );
}
