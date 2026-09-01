import { Link as RouterLink } from 'react-router';
import { Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { buildCommPreferenceLabels } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';

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
    <Card variant="outlined" data-testid="comm-preference-entry">
      <CardActionArea component={RouterLink} to={COMM_PREFERENCE_PATH}>
        <CardContent>
          <Stack direction="row" spacing={1.5} sx={{
            alignItems: "center"
          }}>
            <ForumOutlinedIcon color="action" />
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{
                fontWeight: 700
              }}>
                {labels.title}
              </Typography>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {labels.entryHint}
              </Typography>
            </Stack>
            <ChevronRightIcon color="action" />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
