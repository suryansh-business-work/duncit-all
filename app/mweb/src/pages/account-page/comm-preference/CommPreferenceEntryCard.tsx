import { Link as RouterLink } from 'react-router';
import { Card, CardActionArea, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { buildCommPreferenceLabels } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import IconDisc from '../IconDisc';

/** Where the three channels live. */
export const COMM_PREFERENCE_PATH = '/account/communication';

/**
 * Profile Settings → Communication Preferences: ONE row, not three cards.
 *
 * Profile Settings is a list of subjects, and "where Duncit messages you" is
 * one subject. Expanding it inline made the longest block on the page out of
 * the settings the fewest people change, and put a switch two scrolls above
 * the screen that owns the rest of that channel. The row is a door; everything
 * behind it is on the other side of it.
 */
export default function CommPreferenceEntryCard() {
  const { t } = useTranslation();
  const labels = buildCommPreferenceLabels(t);

  return (
    <Card data-testid="comm-preference-entry">
      <CardActionArea component={RouterLink} to={COMM_PREFERENCE_PATH} sx={{ px: 2, py: 1.75 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <IconDisc>
            <ForumOutlinedIcon />
          </IconDisc>
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 500 }}>{labels.title}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {labels.entryHint}
            </Typography>
          </Stack>
          <ChevronRightIcon sx={{ color: 'text.secondary' }} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}
