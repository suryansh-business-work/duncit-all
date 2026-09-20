import type { DragEvent } from 'react';
import { Box, ButtonBase, Stack, Typography, useTheme } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { NODE_KINDS, paletteFor, type NodeKind } from '../node-kinds';
import type { AutomationChannel } from '../types';
import { DRAG_KIND } from './FlowCanvas';
import { toneColor } from './nodes/tone';

interface Props {
  channel: AutomationChannel;
  onAdd: (kind: NodeKind) => void;
}

/**
 * The steps a flow may add. Each row is a button — click adds the step under
 * the last one — and is also draggable onto the canvas for anyone who wants
 * to place it by hand. The click path is what keeps this usable without a
 * pointer (WCAG 2.5.7).
 */
export default function NodePalette({ channel, onAdd }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();

  const startDrag = (kind: NodeKind) => (event: DragEvent) => {
    event.dataTransfer.setData(DRAG_KIND, kind);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Stack spacing={1} sx={{ p: 1.5 }} data-testid="automation-palette">
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('ai.automation.builder.palette')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('ai.automation.builder.paletteHint')}
        </Typography>
      </Box>
      {paletteFor(channel).map((kind) => {
        const meta = NODE_KINDS[kind];
        const Icon = meta.icon;
        const color = toneColor(theme, meta.tone);
        const label = t(meta.labelKey);
        return (
          <ButtonBase
            key={kind}
            draggable
            onDragStart={startDrag(kind)}
            onClick={() => onAdd(kind)}
            aria-label={t('ai.automation.builder.addStep', { vars: { name: label } })}
            data-testid={`automation-palette-${kind}`}
            sx={{
              justifyContent: 'flex-start',
              textAlign: 'left',
              gap: 1.25,
              px: 1.25,
              py: 1,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderLeft: `4px solid ${color}`,
              bgcolor: 'background.paper',
              cursor: 'grab',
              minHeight: 44,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Box sx={{ color, display: 'flex' }}>
              <Icon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {label}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.3 }}>
                {t(meta.hintKey)}
              </Typography>
            </Box>
          </ButtonBase>
        );
      })}
    </Stack>
  );
}
