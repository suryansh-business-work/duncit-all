import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import type { IntelSourceCard } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { SOURCE_LABEL_KEYS, STATE_COLOR, STATE_LABEL_KEYS, sourceIcon } from '../../components/sources';
import { relativeTime } from '../../lib/time';

/** Why a source is in error, as the server reports it (literal keys for the translation gate). */
const ERROR_DETAIL_KEYS: Record<string, string> = {
  not_configured: 'intel.sources.detail.notConfigured',
  unreachable: 'intel.sources.detail.unreachable',
  index_down: 'intel.sources.detail.indexDown',
  index_failed: 'intel.sources.detail.indexFailed',
};

function useDetail(card: IntelSourceCard): string {
  const { t } = useTranslation();
  const errorKey = ERROR_DETAIL_KEYS[card.detail];
  if (card.state === 'ERROR' && errorKey) return t(errorKey);
  const vars = { vars: { count: card.indexed } };
  if (card.detail === 'models') return t('intel.sources.detail.models', vars);
  if (card.indexed <= 0) return t('intel.sources.detail.none');
  return card.detail === 'tools' ? t('intel.sources.detail.tools', vars) : t('intel.sources.detail.items', vars);
}

/** One source on the start screen: its live state (from the server, never assumed), size and freshness. */
export default function SourceCard({ card }: Readonly<{ card: IntelSourceCard }>) {
  const { t } = useTranslation();
  const label = t(SOURCE_LABEL_KEYS[card.source] ?? 'intel.sources.MEDIA');
  const state = t(STATE_LABEL_KEYS[card.state] ?? 'intel.states.DISCONNECTED');
  const detail = useDetail(card);
  return (
    <Paper
      variant="outlined"
      role="group"
      aria-label={`${label}: ${state}. ${detail}`}
      sx={{ p: 1.5, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 0.75, transition: 'border-color .2s, transform .2s', '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' } }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Box sx={{ color: 'primary.main', display: 'flex', flexShrink: 0 }} aria-hidden>
          {sourceIcon(card.source)}
        </Box>
        <Typography variant="subtitle2" noWrap sx={{ flex: 1, minWidth: 0 }}>
          {label}
        </Typography>
        <Chip size="small" variant="outlined" color={STATE_COLOR[card.state] ?? 'default'} label={state} sx={{ flexShrink: 0 }} />
      </Stack>
      <Typography variant="caption" color="text.secondary" noWrap title={detail}>
        {detail}
      </Typography>
      {card.last_sync_at && (
        <Typography variant="caption" color="text.secondary" noWrap>
          {t('intel.sources.lastSync', { vars: { when: relativeTime(card.last_sync_at, t) } })}
        </Typography>
      )}
    </Paper>
  );
}
