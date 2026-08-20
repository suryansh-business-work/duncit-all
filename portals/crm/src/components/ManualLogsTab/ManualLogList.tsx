import { Box, Card, Chip, Stack, Typography } from '@mui/material';
import { DuncitRichTextInput } from '@duncit/rich-text';
import type { CrmActivity } from '../../api/crm.types';
import { formatLogTimestamp, logKey } from './logUtils';
import { formatDate } from '@duncit/app-settings';

interface Props {
  groups: Array<[string, CrmActivity[]]>;
}

export function ManualLogList({ groups }: Readonly<Props>) {
  if (groups.length === 0)
    return (
      <Card variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No manual logs in this window. Capture conversations, follow-ups, or decisions here.
        </Typography>
      </Card>
    );
  return (
    <Stack spacing={2}>
      {groups.map(([day, entries]) => {
        const heading = formatDate(day);
        return (
          <Box key={day}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: 'text.secondary',
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}
            >
              {heading} · {entries.length} {entries.length === 1 ? 'log' : 'logs'}
            </Typography>
            <Stack spacing={1.25} sx={{ mt: 1 }}>
              {entries.map((activity) => (
                <Card key={logKey(activity)} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                    {activity.summary ? (
                      <Typography variant="subtitle2" fontWeight={700}>
                        {activity.summary}
                      </Typography>
                    ) : null}
                    <Chip
                      size="small"
                      label={formatLogTimestamp(activity.created_at)}
                      variant="outlined"
                    />
                    {activity.created_by ? (
                      <Chip size="small" label={`by ${activity.created_by}`} variant="outlined" />
                    ) : null}
                  </Stack>
                  {activity.body_html?.trim() ? (
                    <DuncitRichTextInput
                      value={activity.body_html}
                      onChange={() => undefined}
                      readOnly
                      bare
                    />
                  ) : (
                    <Typography variant="body2">{activity.body_text}</Typography>
                  )}
                </Card>
              ))}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
