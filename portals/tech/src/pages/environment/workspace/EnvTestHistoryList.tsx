import { useQuery } from '@apollo/client/react';
import { Chip, List, ListItem, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { QueryGuard } from '@duncit/ui';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import type { QueryEnvTestHistoryArgs } from '@duncit/gql-types';
import { ENV_TEST_HISTORY } from './workspace-queries';

interface Props extends QueryEnvTestHistoryArgs {
  /** Show which entry each line belongs to — on for the cross-entry feed. */
  showEntry?: boolean;
}

/** Test runs, newest first: what ran, whether it passed, what it said, who ran it and when. */
export default function EnvTestHistoryList({ entryId, category, limit, showEntry = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(ENV_TEST_HISTORY, {
    variables: { entryId, category, limit },
    fetchPolicy: 'cache-and-network',
  });
  const rows = data?.envTestHistory ?? [];

  return (
    <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
      {rows.length === 0 ? (
        <Typography variant="body2" role="status" sx={{ color: 'text.secondary', py: 1 }}>
          {t('tech.environment.noTestHistory')}
        </Typography>
      ) : (
        <List dense disablePadding data-testid="env-test-history">
          {rows.map((row) => (
            <ListItem key={row.id} divider alignItems="flex-start" disableGutters>
              <ListItemIcon sx={{ minWidth: (theme) => theme.spacing(4), mt: 0.5 }}>
                {row.ok ? (
                  <CheckCircleIcon fontSize="small" color="success" titleAccess={t('tech.environment.historyPassed')} />
                ) : (
                  <CancelIcon fontSize="small" color="error" titleAccess={t('tech.environment.historyFailed')} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    {showEntry ? (
                      <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
                        {row.entry_name}
                      </Typography>
                    ) : null}
                    <Chip size="small" variant="outlined" label={row.kind} />
                    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
                      {formatDateTime(row.created_at)}
                      {row.tested_by ? ` · ${t('tech.environment.historyBy', { vars: { name: row.tested_by } })}` : ''}
                    </Typography>
                  </Stack>
                }
                secondary={row.message}
                slotProps={{ secondary: { sx: { wordBreak: 'break-word' } } }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </QueryGuard>
  );
}
