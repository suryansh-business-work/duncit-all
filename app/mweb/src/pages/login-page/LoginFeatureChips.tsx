import type { ReactElement } from 'react';
import { Chip, Stack } from '@mui/material';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import { auth } from '@duncit/auth-tokens';
import { useTranslation } from '../../i18n/useTranslation';

const CHIPS: ReadonlyArray<{ key: string; icon: ReactElement }> = [
  { key: 'mweb.login.chipLocalEvents', icon: <EventNoteRoundedIcon /> },
  { key: 'mweb.login.chipMeetPeople', icon: <GroupsRoundedIcon /> },
  { key: 'mweb.login.chipNearbyPods', icon: <PlaceRoundedIcon /> },
];

/**
 * What Duncit is, in three words each, under the landing heading. Decorative
 * labels, not controls — so plain chips with no click handler. Native twin:
 * screens/LoginScreen/LoginFeatureChips.
 */
export default function LoginFeatureChips() {
  const { t } = useTranslation();
  return (
    <Stack
      data-testid="login-feature-chips"
      direction="row"
      useFlexGap
      spacing={1}
      sx={{ flexWrap: 'wrap' }}
    >
      {CHIPS.map(({ key, icon }) => (
        <Chip
          key={key}
          icon={icon}
          label={t(key)}
          variant="outlined"
          sx={{
            bgcolor: 'background.paper',
            borderColor: 'divider',
            borderRadius: `${auth.hero.chipRadius}px`,
            fontWeight: 600,
            '& .MuiChip-icon': { color: 'accent.main' },
          }}
        />
      ))}
    </Stack>
  );
}
