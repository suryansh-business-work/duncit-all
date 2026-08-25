import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import {
  profileCompletion,
  type ProfileForCompletion,
} from './account-edit/completion';
import { useTranslation } from '../../i18n/useTranslation';

export interface CompletionMeterProps {
  profile: ProfileForCompletion;
}

/**
 * Small read-only "profile completion" meter shown on the Account page. Computes
 * the percentage from the loaded profile via the shared pure helper (RN twin in
 * the mobile CompletionMeter). No backend write.
 */
export default function CompletionMeter({ profile }: Readonly<CompletionMeterProps>) {
  const { t } = useTranslation();
  const percent = profileCompletion(profile);

  return (
    <Box data-testid="profile-completion">
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "baseline",
          mb: 0.5
        }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Profile completion
        </Typography>
        <Typography variant="body2" data-testid="profile-completion-value" sx={{
          color: "text.secondary"
        }}>
          {percent}% complete
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percent}
        aria-label={t('mweb.account.profileCompletion')}
        sx={{ height: 8, borderRadius: '8px' }}
      />
    </Box>
  );
}
