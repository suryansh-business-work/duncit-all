import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import {
  profileCompletion,
  type ProfileForCompletion,
} from './account-edit/completion';

export interface CompletionMeterProps {
  profile: ProfileForCompletion;
}

/**
 * Small read-only "profile completion" meter shown on the Account page. Computes
 * the percentage from the loaded profile via the shared pure helper (RN twin in
 * the mobile CompletionMeter). No backend write.
 */
export default function CompletionMeter({ profile }: Readonly<CompletionMeterProps>) {
  const percent = profileCompletion(profile);

  return (
    <Box data-testid="profile-completion">
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Profile completion
        </Typography>
        <Typography variant="body2" color="text.secondary" data-testid="profile-completion-value">
          {percent}% complete
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percent}
        aria-label="Profile completion"
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
}
