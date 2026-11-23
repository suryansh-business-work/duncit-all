import { Chip, CircularProgress, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

export interface ToolChipItem {
  name: string;
  title?: string | null;
  status: string;
}

const COLOR: Record<string, 'default' | 'success' | 'error' | 'warning' | 'info'> = {
  OK: 'success',
  FAILED: 'error',
  DENIED: 'warning',
  AWAITING_APPROVAL: 'info',
  RUNNING: 'default',
};

const STATUS_KEYS: Record<string, string> = {
  OK: 'intel.chat.tool.OK',
  FAILED: 'intel.chat.tool.FAILED',
  DENIED: 'intel.chat.tool.DENIED',
  AWAITING_APPROVAL: 'intel.chat.tool.AWAITING_APPROVAL',
  RUNNING: 'intel.chat.tool.RUNNING',
};

/** What the assistant did to answer: each search, query or tool call and how it went. */
export default function ToolChips({ items }: Readonly<{ items: ToolChipItem[] }>) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mb: 1 }} aria-live="polite">
      {items.map((item, i) => (
        <Chip
          key={`${item.name}-${i}`}
          size="small"
          variant="outlined"
          color={COLOR[item.status] ?? 'default'}
          icon={item.status === 'RUNNING' ? <CircularProgress size={12} /> : undefined}
          label={`${item.title || item.name} · ${t(STATUS_KEYS[item.status] ?? 'intel.chat.tool.OK')}`}
          sx={{ maxWidth: '100%' }}
        />
      ))}
    </Stack>
  );
}
