import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import type { IntelSourceCard } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { SOURCE_LABEL_KEYS, STATE_COLOR, STATE_LABEL_KEYS, sourceIcon } from '../../components/sources';
import { relativeTime } from '../../lib/time';

/** One source on the start screen: its live state (from the server, never assumed), size and freshness. */
export default function SourceCard({ card }: Readonly<{ card: IntelSourceCard }>) {
  const { t } = useTranslation();
  const label = t(SOURCE_LABEL_KEYS[card.source] ?? 'intel.sources.MEDIA');
  const vars = { vars: { count: card.indexed } };
  let detail = t('intel.sources.detail.none');
  if (card.indexed > 0) detail = card.detail === 'tools' ? t('intel.sources.detail.tools', vars) : t('intel.sources.detail.items', vars);
  return (
    <Paper
      variant="outlined"
      role="group"
      aria-label={`${label}: ${t(STATE_LABEL_KEYS[card.state] ?? 'intel.states.DISCONNECTED')}`}
      sx={{ p: 1.5, borderRadius: 2, height: '100%', transition: 'border-color .2s, transform .2s', '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' } }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ color: 'primary.main', pt: 0.25 }} aria-hidden>
          {sourceIcon(card.source)}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" noWrap>
            {label}
          </Typography>
          <Chip size="small" variant="outlined" color={STATE_COLOR[card.state] ?? 'default'} label={t(STATE_LABEL_KEYS[card.state] ?? 'intel.states.DISCONNECTED')} sx={{ my: 0.5, height: 20 }} />
          <Typography variant="caption" color="text.secondary" component="p" noWrap>
            {detail}
          </Typography>
          {card.last_sync_at && (
            <Typography variant="caption" color="text.secondary" component="p" noWrap>
              {t('intel.sources.lastSync', { vars: { when: relativeTime(card.last_sync_at, t) } })}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
