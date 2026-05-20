import { Chip, Stack, Typography } from '@mui/material';

export interface BlockRow {
  id: string;
  template_id: string | null;
  from: string;
  to: string;
  reason: string;
}

interface Props {
  blocks: BlockRow[];
  templateLabelById?: (templateId: string | null) => string;
  onUnblock: (block: BlockRow) => void;
}

const fmt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export default function BlockedRangeList({ blocks, templateLabelById, onUnblock }: Props) {
  if (!blocks.length) {
    return (
      <Typography variant="caption" color="text.secondary">
        No active blocks.
      </Typography>
    );
  }
  return (
    <Stack spacing={1}>
      {blocks.map((block) => (
        <Stack
          key={block.id}
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ borderRadius: 2, border: 1, borderColor: 'divider', p: 1 }}
        >
          <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {fmt(block.from)} → {fmt(block.to)}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {templateLabelById?.(block.template_id) ?? 'All slots'} · {block.reason}
            </Typography>
          </Stack>
          <Chip
            size="small"
            label="Unblock"
            color="primary"
            variant="outlined"
            onClick={() => onUnblock(block)}
          />
        </Stack>
      ))}
    </Stack>
  );
}
