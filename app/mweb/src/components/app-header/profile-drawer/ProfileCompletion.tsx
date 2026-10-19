import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';

interface ProfileCompletionProps {
  percent: number;
  onComplete: () => void;
}

/** The completion nudge inside the profile card — "Your profile is N%
 * complete", a thin primary bar and the red Complete pill, which opens
 * Account. Shown while completion is under 100%. Native twin:
 * Sidebar/SidebarProfileCompletion. */
export default function ProfileCompletion({ percent, onComplete }: Readonly<ProfileCompletionProps>) {
  const { t } = useTranslation();
  const label = t('mweb.sidebar.profileProgress', { vars: { pct: percent } });
  return (
    <Stack data-testid="profile-completion" direction="row" spacing={1.5} sx={{ alignItems: 'center', pt: 1.75 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography id="sidebar-profile-progress" noWrap sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>
          {label}
        </Typography>
        <LinearProgress
          data-testid="profile-completion-bar"
          variant="determinate"
          value={percent}
          aria-labelledby="sidebar-profile-progress"
          sx={{ height: 4 }}
        />
      </Box>
      <DuncitButton
        data-testid="profile-completion-cta"
        onClick={onComplete}
        variant="contained"
        size="small"
        aria-label={t('mweb.sidebar.completeYourProfile')}
        sx={{ flexShrink: 0, height: 32, minHeight: 32, px: 1.75 }}
      >
        {t('mweb.sidebar.complete')}
      </DuncitButton>
    </Stack>
  );
}
