import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SubtitlesIcon from '@mui/icons-material/Subtitles';
import { formatTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { TranscriptSegment } from '../../api/call.gql';

interface Props {
  segments: TranscriptSegment[];
  /** Live transcription is on in the Tech portal. */
  enabled: boolean;
}

/** Segments whose text contains the query, case-insensitively. */
export function filterSegments(segments: TranscriptSegment[], query: string): TranscriptSegment[] {
  const q = query.trim().toLowerCase();
  if (!q) return segments;
  return segments.filter((s) => s.text.toLowerCase().includes(q));
}

/**
 * The call as it is spoken: who said it (you or the contact), when, and what,
 * with a search box. New lines are announced politely to screen readers, and
 * the list follows the newest line unless the agent is searching.
 */
export default function CallTranscriptPanel({ segments, enabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => filterSegments(segments, query), [segments, query]);

  useEffect(() => {
    const list = listRef.current;
    if (list && !query) list.scrollTop = list.scrollHeight;
  }, [segments.length, query]);

  let empty: string | null = null;
  if (!enabled && segments.length === 0) empty = t('crm.call.transcriptOff');
  else if (segments.length === 0) empty = t('crm.call.transcriptEmpty');
  else if (shown.length === 0) empty = t('crm.call.transcriptNoMatch', { vars: { query: query.trim() } });

  return (
    <Stack spacing={1} sx={{ minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <SubtitlesIcon fontSize="small" color="primary" aria-hidden />
        <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
          {t('crm.call.transcriptTitle')}
        </Typography>
      </Stack>
      {segments.length > 0 && (
        <TextField
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('crm.call.transcriptSearch')}
          slotProps={{
            htmlInput: { 'aria-label': t('crm.call.transcriptSearch') },
            input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
          }}
        />
      )}
      <Box ref={listRef} aria-live="polite" data-testid="call-transcript" sx={{ overflowY: 'auto', maxHeight: (theme) => theme.spacing(40), pr: 0.5 }}>
        {empty ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
            {empty}
          </Typography>
        ) : (
          <Stack component="ol" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {shown.map((s) => (
              <Box component="li" key={`${s.speaker}-${s.seq}`}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip
                    size="small"
                    color={s.speaker === 'AGENT' ? 'primary' : 'secondary'}
                    label={s.speaker === 'AGENT' ? t('crm.call.speakerAgent') : t('crm.call.speakerLead')}
                  />
                  {s.at && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {formatTime(new Date(s.at))}
                    </Typography>
                  )}
                </Stack>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                  {s.text}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
