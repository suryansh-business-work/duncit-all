import { useId, type ReactNode } from 'react';
import { Box, Drawer, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Who wrote it — the drawer is named for screen readers by it. */
  title: string;
  /** Where it came from, under the title; nothing when empty. */
  subtitle?: string;
  testId: string;
  children: ReactNode;
}

/** The Inbox's right-hand drawer — a comment or a conversation, opened: titled, closable, the content below. */
export default function InboxDrawerShell({ open, onClose, title, subtitle, testId, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { 'aria-labelledby': titleId, sx: { width: { xs: '100%', md: 600 } } } }}>
      <Stack spacing={2} sx={{ p: 2 }} data-testid={testId}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id={titleId} variant="h6" component="h2" sx={{ wordBreak: 'break-word' }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Tooltip title={t('shell.common.close')}>
            <DuncitIconButton onClick={onClose}>
              <CloseIcon />
            </DuncitIconButton>
          </Tooltip>
        </Stack>
        {children}
      </Stack>
    </Drawer>
  );
}
