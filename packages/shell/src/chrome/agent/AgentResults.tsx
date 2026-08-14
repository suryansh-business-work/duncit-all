import { Box, Chip, List, ListItem, ListItemText, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '../../i18n/useTranslation';
import type { AgentResultItem } from './queries';

/**
 * What the run actually made.
 *
 * Every item is listed, created or not — a batch that made seven of ten has to
 * show which three did not and what stopped them, because that reason is the
 * only thing that tells the operator what to fix before asking again.
 */
export function AgentResults({ items }: Readonly<{ items: AgentResultItem[] }>) {
  const { t } = useTranslation();
  // The slot instant arrives as ISO; the date format and zone are the admin's.
  const { formatDateTime } = useDateFormat();
  if (items.length === 0) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {t('shell.agent.resultsTitle')}
      </Typography>
      <List dense disablePadding sx={{ mt: 0.25 }}>
        {items.map((item) => (
          <ListItem
            key={`${item.kind}-${item.title}`}
            disableGutters
            sx={{ alignItems: 'flex-start', py: 0.25 }}
          >
            <Box sx={{ mr: 1, mt: 0.25, display: 'flex' }}>
              {item.ok ? (
                <CheckCircleOutlineIcon fontSize="small" color="success" />
              ) : (
                <ErrorOutlineIcon fontSize="small" color="error" />
              )}
            </Box>
            <ListItemText
              primary={
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {item.title}
                  </Typography>
                  {item.ref ? (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={item.ref}
                      sx={{ fontFamily: 'monospace', height: 18, fontSize: 11 }}
                    />
                  ) : null}
                  {item.ok ? null : (
                    <Chip size="small" color="error" label={t('shell.agent.failedLabel')} sx={{ height: 18 }} />
                  )}
                </Box>
              }
              secondary={
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                  {item.when ? `${formatDateTime(item.when)} · ${item.detail}` : item.detail}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
