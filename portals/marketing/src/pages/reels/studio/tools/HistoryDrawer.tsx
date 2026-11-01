import { useMemo } from 'react';
import { Box, Drawer, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import RestoreIcon from '@mui/icons-material/Restore';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { EmptyState } from '@duncit/ui';
import type { ReelMessage } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  messages: readonly ReelMessage[];
  onRestore: (messageId: string) => Promise<void>;
}

/**
 * Every version the editor made, newest first, each one a step back. The
 * versions are the chat's own restorable replies — the history and the
 * conversation are one record, read two ways.
 */
export default function HistoryDrawer({ open, onClose, messages, onRestore }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const versions = useMemo(() => messages.filter((message) => message.restorable).reverse(), [messages]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 400 } } } }} data-testid="reel-history-drawer">
      <Stack sx={{ height: '100%' }} role="region" aria-labelledby="reel-history-title">
        <Stack direction="row" sx={{ alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography id="reel-history-title" variant="h6" component="h2" sx={{ flex: 1 }}>
            {t('ai.reels.history.title')}
          </Typography>
          <DuncitIconButton aria-label={t('shell.common.close')} onClick={onClose} data-testid="reel-history-close">
            <CloseIcon />
          </DuncitIconButton>
        </Stack>
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {versions.length === 0 ? (
            <EmptyState compact icon={<HistoryIcon />} title={t('ai.reels.history.emptyTitle')} body={t('ai.reels.history.emptyBody')} data-testid="reel-history-empty" />
          ) : (
            <List aria-label={t('ai.reels.history.listLabel')} data-testid="reel-history-list">
              {versions.map((message, index) => (
                <ListItem key={message.id} sx={{ display: 'block', borderBottom: '1px solid', borderColor: 'divider' }} data-testid={`reel-history-${message.id}`}>
                  <ListItemText
                    primary={index === 0 ? t('ai.reels.history.latest', { vars: { when: formatDateTime(message.at) } }) : formatDateTime(message.at)}
                    secondary={message.text}
                    slotProps={{
                      primary: { variant: 'subtitle2' },
                      secondary: { sx: { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } },
                    }}
                  />
                  <DuncitButton size="small" startIcon={<RestoreIcon />} onClick={() => onRestore(message.id)} data-testid={`reel-history-restore-${message.id}`}>
                    {t('ai.reels.history.restore')}
                  </DuncitButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Stack>
    </Drawer>
  );
}
