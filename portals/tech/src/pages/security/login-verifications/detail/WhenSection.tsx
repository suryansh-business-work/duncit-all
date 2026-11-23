import { Box, List, ListItem, Stack, Typography } from '@mui/material';
import { SectionCard, StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import Facts from '../../Facts';
import { METHOD_KEY, RESULT_COLOR, RESULT_KEY, enumLabel, joinParts, timeOf } from '../../labels';
import type { LogDetail, RelatedLog } from '../queries';

/** The same person's other verifications, newest first — their time log across the consoles. */
function TimeLog({ items }: Readonly<{ items: RelatedLog[] }>) {
  const { t } = useTranslation();
  const title = t('tech.loginVerifications.when.others');
  return (
    <Box>
      <Typography variant="subtitle2" component="h4">
        {title}
      </Typography>
      {items.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tech.loginVerifications.when.noOthers')}
        </Typography>
      ) : (
        <List dense disablePadding aria-label={title}>
          {items.map((item) => (
            <ListItem key={item.id} disableGutters sx={{ justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2">{timeOf(item.created_at)}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {joinParts([item.portal_key, enumLabel(t, METHOD_KEY, item.method)], ' · ')}
                </Typography>
              </Box>
              <StatusChip
                status={item.result}
                colorMap={RESULT_COLOR}
                label={enumLabel(t, RESULT_KEY, item.result)}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

/** When they signed in, when they verified, and every other time they did. */
export default function WhenSection({ detail }: Readonly<{ detail: LogDetail }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('tech.loginVerifications.when.title')}>
      <Stack spacing={2}>
        <Facts
          items={[
            { label: t('tech.loginVerifications.when.signedIn'), value: timeOf(detail.signed_in_at) },
            { label: t('tech.loginVerifications.when.verified'), value: timeOf(detail.created_at) },
            { label: t('tech.loginVerifications.when.timezone'), value: detail.timezone },
          ]}
        />
        <TimeLog items={detail.related} />
      </Stack>
    </SectionCard>
  );
}
