import { useNavigate } from 'react-router';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

/** The gate's last screen: the booked slot, and the way home. */
export default function GateThanks({ slotLabel }: Readonly<{ slotLabel: string }>) {
  const navigate = useNavigate();

  return (
    <Stack data-testid="gate-thanks" spacing={2}>
      <Alert data-testid="gate-thanks-message" severity="success">
        Thank you for your submission! Your onboarding meeting is booked for{' '}
        <strong>{slotLabel}</strong>. Our onboarding team will meet you at your selected
        slot — please join 5 minutes early.
      </Alert>
      <DuncitButton
        data-testid="thanks-done"
        variant="contained"
        size="large"
        fullWidth
        onClick={() => navigate('/', { replace: true })}
      >
        Back to Home
      </DuncitButton>
    </Stack>
  );
}
