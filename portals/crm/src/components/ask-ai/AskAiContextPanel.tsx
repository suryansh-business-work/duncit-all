import { useState } from 'react';
import { Box, ButtonBase, Chip, Collapse, LinearProgress, Stack, Typography } from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTranslation } from '@duncit/shell';
import type { AskAiContext } from '../../api/askAi.gql';

interface Props {
  context: AskAiContext | null;
  loading: boolean;
}

const kb = (chars: number) => (chars / 1024).toFixed(1);

/** One literal key per source the server reports (the translation gate needs literals). */
const SOURCE_LABEL: Record<string, string> = {
  profile: 'crm.askAi.source.profile',
  notes: 'crm.askAi.source.notes',
  activity: 'crm.askAi.source.activity',
  emails: 'crm.askAi.source.emails',
  calls: 'crm.askAi.source.calls',
  reminders: 'crm.askAi.source.reminders',
  website: 'crm.askAi.source.website',
  conversation: 'crm.askAi.source.conversation',
};

/**
 * What the assistant read before answering: every source with its record
 * count and token estimate, plus the total. Collapsed to one line by default
 * so the conversation keeps the room.
 */
export default function AskAiContextPanel({ context, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (loading && !context) {
    return (
      <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }} role="status">
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('crm.askAi.buildingContext')}</Typography>
        <LinearProgress sx={{ mt: 0.5 }} />
      </Box>
    );
  }
  if (!context) return null;

  const used = context.sources.filter((s) => s.chars > 0);
  const summary = t('crm.askAi.contextSummary', {
    vars: { tokens: context.total_tokens.toLocaleString(), size: kb(context.total_chars), sources: used.length },
  });

  return (
    // Capped so an expanded source list on a short or zoomed screen scrolls on its
    // own instead of pushing the composer out of the drawer.
    <Box sx={{ flexShrink: 0, maxHeight: '40%', overflowY: 'auto', borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }} data-testid="crm-ask-ai-context">
      <ButtonBase
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="crm-ask-ai-context-sources"
        sx={{ width: '100%', justifyContent: 'flex-start', gap: 1, px: 1.5, py: 1, textAlign: 'left' }}
      >
        <MemoryIcon fontSize="small" color="secondary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{t('crm.askAi.contextTitle')}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{summary}</Typography>
        </Box>
        {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </ButtonBase>
      <Collapse in={open} id="crm-ask-ai-context-sources">
        <Stack component="ul" spacing={0.5} sx={{ listStyle: 'none', m: 0, px: 1.5, pb: 1.25 }}>
          {context.sources.map((s) => (
            <Stack component="li" key={s.key} direction="row" spacing={1} sx={{ alignItems: 'center' }} data-testid={`crm-ask-ai-source-${s.key}`}>
              <Typography variant="caption" sx={{ flex: 1, color: s.chars > 0 ? 'text.primary' : 'text.disabled' }}>
                {SOURCE_LABEL[s.key] ? t(SOURCE_LABEL[s.key]) : s.key}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('crm.askAi.sourceStats', { vars: { items: s.items, tokens: s.tokens.toLocaleString() } })}
              </Typography>
              {s.truncated && <Chip size="small" variant="outlined" color="warning" label={t('crm.askAi.trimmed')} />}
            </Stack>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}
