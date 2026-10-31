import { Box, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import type { MarketingRunApiEntry } from './queries';
import { formatDuration, type Translate } from './runFormat';

const HTTP_OK_FROM = 200;
const HTTP_ERROR_FROM = 400;

interface EntryProps {
  entry: MarketingRunApiEntry;
  t: Translate;
  formatDateTime: (value: string) => string;
}

function ApiEntry({ entry, t, formatDateTime }: Readonly<EntryProps>) {
  const ok = entry.status >= HTTP_OK_FROM && entry.status < HTTP_ERROR_FROM;
  // When it happened and what came back, as one line; either may be missing.
  const detail = [entry.at ? formatDateTime(entry.at) : '', entry.summary].filter(Boolean).join(' · ');
  return (
    <Stack component="li" spacing={0.25} sx={{ py: 0.75, borderBottom: 1, borderColor: 'divider' }} data-testid="marketing-run-api-entry">
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {entry.service}
        </Typography>
        <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
          {entry.method} {entry.url}
        </Typography>
        <Typography
          variant="caption"
          data-outcome={ok ? 'ok' : 'error'}
          sx={{ fontWeight: 700, color: ok ? 'success.main' : 'error.main' }}
        >
          {entry.status}
        </Typography>
        {entry.ms > 0 && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {formatDuration(entry.ms, t)}
          </Typography>
        )}
      </Stack>
      {detail && (
        <Typography variant="caption" component="div" sx={{ color: 'text.secondary', wordBreak: 'break-word' }}>
          {detail}
        </Typography>
      )}
    </Stack>
  );
}

/** Every call the run made to another service, in order — the trail to follow when one of them failed. */
export default function RunApiLog({ entries }: Readonly<{ entries: MarketingRunApiEntry[] }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  return (
    <Box data-testid="marketing-run-api-log">
      <Typography component="h3" variant="subtitle2" sx={{ mb: 0.5 }}>
        {t('marketing.runs.apiLogTitle')}
      </Typography>
      {entries.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('marketing.runs.noApiLog')}
        </Typography>
      ) : (
        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {entries.map((entry, index) => (
            // Entries have no id of their own; the log is append-only, so the position is part of the key.
            <ApiEntry key={[index, entry.method, entry.url].join(':')} entry={entry} t={t} formatDateTime={formatDateTime} />
          ))}
        </Box>
      )}
    </Box>
  );
}
