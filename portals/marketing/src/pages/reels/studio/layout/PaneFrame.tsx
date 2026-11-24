import type { ReactNode } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { PaneId } from './layoutModel';

interface Props {
  id: PaneId;
  title: string;
  onPopOut: () => void;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A docked pane: a slim bar naming it, with the way to pop it out into its own
 * window and the way to close it and give its room to the others, then the
 * pane itself filling what is left. Layout → Show brings a closed pane back.
 */
export default function PaneFrame({ id, title, onPopOut, onClose, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const key = id.toLowerCase();

  return (
    <Stack component="section" aria-label={title} sx={{ height: '100%', minHeight: 0, minWidth: 0 }} data-testid={`reel-pane-${key}`}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', gap: 0.5, pl: 1.5, pr: 0.5, minHeight: (theme) => theme.spacing(4), borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}
      >
        <Typography variant="caption" component="h2" sx={{ fontWeight: 700, color: 'text.secondary', flex: 1, minWidth: 0 }} noWrap>
          {title}
        </Typography>
        <Tooltip title={t('ai.reels.layout.popOut')}>
          <DuncitIconButton size="small" aria-label={t('ai.reels.layout.popOutNamed', { vars: { name: title } })} onClick={onPopOut} data-testid={`reel-pane-popout-${key}`}>
            <OpenInNewIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        <Tooltip title={t('ai.reels.layout.close')}>
          <DuncitIconButton size="small" aria-label={t('ai.reels.layout.closeNamed', { vars: { name: title } })} onClick={onClose} data-testid={`reel-pane-close-${key}`}>
            <CloseIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{children}</Box>
    </Stack>
  );
}
