import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { ADD_CRM_MANUAL_LOG, ECOMM_LEAD, HOST_LEAD, VENUE_LEAD } from '../api/crm.gql';
import type { CrmActivity } from '../api/crm.types';
import RichTextField from '../forms/fields/RichTextField';
import { parseApiError } from '../utils/parseApiError';

interface Props {
  entityType: 'VENUE_LEAD' | 'HOST_LEAD' | 'ECOMM_LEAD';
  entityId: string;
  /** All activity entries; we filter to NOTE here and show others as ambient context. */
  activities: CrmActivity[];
}

type Granularity = 'all' | 'today' | 'week' | 'month';

const formatTs = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Stable key for a NOTE row — activities carry no id, so we hash the content. */
const logKey = (a: CrmActivity) =>
  `${a.created_at ?? ''}|${a.created_by ?? ''}|${a.summary ?? ''}|${a.body_text ?? ''}`;

const startOfWindow = (g: Granularity): Date | null => {
  const now = new Date();
  if (g === 'today') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (g === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (g === 'month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  return null;
};

/**
 * Activity log viewer + manual NOTE composer. The composer uses a Tiptap
 * RichTextField; the list is grouped by day with the most recent first.
 */
export default function ManualLogsTab({ entityType, entityId, activities }: Readonly<Props>) {
  const [openComposer, setOpenComposer] = useState(false);
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState<{ html: string; text: string }>({ html: '', text: '' });
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('all');

  const refetchQueries = [
    {
      query: { VENUE_LEAD, HOST_LEAD, ECOMM_LEAD }[entityType],
      variables: { id: entityId },
    },
  ];

  const [createLog, { loading: saving }] = useMutation(ADD_CRM_MANUAL_LOG, {
    refetchQueries,
    awaitRefetchQueries: true,
  });

  const filtered = useMemo(() => {
    const cutoff = startOfWindow(granularity);
    return activities
      .filter((a) => a.type === 'NOTE')
      .filter((a) => {
        if (!cutoff) return true;
        const t = a.created_at ? new Date(a.created_at).getTime() : 0;
        return t >= cutoff.getTime();
      })
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
  }, [activities, granularity]);

  const grouped = useMemo(() => {
    // Bucket by yyyy-mm-dd so we can render a date heading per group.
    const map = new Map<string, CrmActivity[]>();
    for (const a of filtered) {
      const d = a.created_at ? new Date(a.created_at) : new Date(0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const submit = async () => {
    setError(null);
    if (!body.html.trim()) {
      setError('Please write something before saving.');
      return;
    }
    try {
      await createLog({
        variables: {
          input: {
            entity_type: entityType,
            entity_id: entityId,
            summary: summary.trim(),
            body_html: body.html,
            body_text: body.text,
          },
        },
      });
      setSummary('');
      setBody({ html: '', text: '' });
      setOpenComposer(false);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1.5}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
          <EventNoteIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>
              Manual logs
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Notes captured by the team. Rich text · grouped by day · newest first.
            </Typography>
          </Box>
        </Stack>
        <Select
          size="small"
          value={granularity}
          onChange={(e) => setGranularity(e.target.value as Granularity)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">All time</MenuItem>
          <MenuItem value="today">Today</MenuItem>
          <MenuItem value="week">Last 7 days</MenuItem>
          <MenuItem value="month">Last 30 days</MenuItem>
        </Select>
        {!openComposer && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenComposer(true)}
            data-testid="manual-log-add"
          >
            New log
          </Button>
        )}
      </Stack>

      {openComposer && (
        <Card
          variant="outlined"
          sx={(t) => ({
            p: 2,
            borderColor: t.palette.primary.main,
            bgcolor: alpha(t.palette.primary.main, 0.04),
          })}
        >
          <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
              New manual log
            </Typography>
            <IconButton
              size="small"
              aria-label="Cancel"
              onClick={() => {
                setOpenComposer(false);
                setError(null);
              }}
              disabled={saving}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <TextField
            fullWidth
            size="small"
            label="Title (optional)"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            sx={{ mb: 1.5 }}
            inputProps={{ 'data-testid': 'manual-log-title' }}
          />
          <RichTextField
            value={body.html}
            onChange={setBody}
            placeholder="Write the conversation, decision, or follow-up details…"
          />
          {error && (
            <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.5 }}>
            <Button
              onClick={() => {
                setOpenComposer(false);
                setError(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={submit}
              disabled={saving || !body.html.trim()}
              data-testid="manual-log-save"
            >
              {saving ? 'Saving…' : 'Save log'}
            </Button>
          </Stack>
        </Card>
      )}

      {grouped.length === 0 ? (
        <Card variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No manual logs in this window. Capture conversations, follow-ups, or decisions here.
          </Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {grouped.map(([day, entries]) => {
            const date = new Date(day);
            const heading = date.toLocaleDateString(undefined, {
              weekday: 'long',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
            return (
              <Box key={day}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 0.4, textTransform: 'uppercase' }}
                >
                  {heading} · {entries.length} {entries.length === 1 ? 'log' : 'logs'}
                </Typography>
                <Stack spacing={1.25} sx={{ mt: 1 }}>
                  {entries.map((a) => (
                    <Card key={logKey(a)} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                        {a.summary && (
                          <Typography variant="subtitle2" fontWeight={700}>
                            {a.summary}
                          </Typography>
                        )}
                        <Chip size="small" label={formatTs(a.created_at)} variant="outlined" />
                        {a.created_by && (
                          <Chip size="small" label={`by ${a.created_by}`} variant="outlined" />
                        )}
                      </Stack>
                      <Box
                        sx={{
                          '& p': { my: 0.5 },
                          '& a': { color: 'primary.main' },
                          '& ul, & ol': { pl: 2.5, my: 0.5 },
                          '& blockquote': {
                            borderLeft: 3,
                            borderColor: 'divider',
                            pl: 1.25,
                            color: 'text.secondary',
                          },
                        }}
                        dangerouslySetInnerHTML={{
                          __html: a.body_html?.trim() || `<p>${a.body_text ?? ''}</p>`,
                        }}
                      />
                    </Card>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
