import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';

export interface PreviewPaneProps {
  /** What the editor is previewing, e.g. "Member preview". */
  title: string;
  /** One line explaining that nothing here is saved yet. */
  hint: string;
  /** Each block is one surface the entity appears on, in reading order. */
  blocks: { id: string; label: string; node: ReactNode }[];
}

/**
 * The right-hand column of a full-page editor: every surface the member will
 * see, stacked and live. Both are shown at once rather than behind a switch —
 * the list card and the detail page are edited by the same fields, and an
 * author changing the title needs to see both react.
 */
export default function PreviewPane({ title, hint, blocks }: Readonly<PreviewPaneProps>) {
  return (
    <Stack spacing={2}>
      <Box>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <VisibilityIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight={800}>
            {title}
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </Box>

      {blocks.map((block) => (
        <Box key={block.id}>
          <Typography
            variant="overline"
            color="text.secondary"
            fontWeight={800}
            sx={{ display: 'block', mb: 0.5 }}
          >
            {block.label}
          </Typography>
          {block.node}
        </Box>
      ))}
    </Stack>
  );
}
