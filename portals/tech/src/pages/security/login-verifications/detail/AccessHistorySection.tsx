import { List, ListItem, ListItemText, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { ACCESS_ACTION_KEY, enumLabel, joinParts, timeOf } from '../../labels';
import type { LogDetail } from '../queries';

/** Who has read this record. Reading it is itself logged on the server, so the reviewer opening it is the newest entry here. */
export default function AccessHistorySection({ entries }: Readonly<{ entries: LogDetail['access_history'] }>) {
  const { t } = useTranslation();
  const title = t('tech.loginVerifications.access.title');
  return (
    <SectionCard title={title}>
      {entries.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tech.loginVerifications.access.empty')}
        </Typography>
      ) : (
        <List dense disablePadding aria-label={title}>
          {entries.map((entry) => (
            <ListItem key={entry.id} disableGutters>
              <ListItemText
                primary={entry.actor_name}
                secondary={joinParts([enumLabel(t, ACCESS_ACTION_KEY, entry.action), timeOf(entry.created_at)], ' · ')}
              />
            </ListItem>
          ))}
        </List>
      )}
    </SectionCard>
  );
}
