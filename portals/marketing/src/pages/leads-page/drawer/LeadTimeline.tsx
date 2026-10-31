import { Chip, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { TIMELINE_LABEL } from '../copy';
import type { MarketingLeadTimelineEntry } from '../queries';

interface Props {
  entries: readonly MarketingLeadTimelineEntry[];
}

/** Everything that happened to the lead, newest first: added, moved, assigned, noted, promoted, seen again. */
export default function LeadTimeline({ entries }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  return (
    <Stack spacing={1} data-testid="lead-timeline">
      <Typography variant="subtitle2">{t('marketing.leads.timelineTitle')}</Typography>
      <List dense disablePadding>
        {[...entries].reverse().map((entry, index) => (
          <ListItem key={`${entry.at ?? ''}-${entry.kind}-${index}`} disableGutters alignItems="flex-start">
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip size="small" variant="outlined" label={t(TIMELINE_LABEL[entry.kind])} />
                  <span>{entry.text}</span>
                </Stack>
              }
              secondary={[entry.by_name, entry.at ? formatDateTime(entry.at) : ''].filter(Boolean).join(' · ')}
              slotProps={{ primary: { component: 'div' } }}
            />
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
