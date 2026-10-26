import { useId, type ReactNode } from 'react';
import { Box, Divider, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface DetailsDrawerProps {
  open: boolean;
  title: string;
  /** A line under the title — the row's own name, say. */
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * The right-hand panel a table row opens. A modal drawer, so focus moves into
 * it, Escape closes it and focus returns to the row; the heading names it.
 */
export default function DetailsDrawer({ open, title, subtitle, onClose, children }: Readonly<DetailsDrawerProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { 'aria-labelledby': titleId, sx: { width: { xs: '100%', sm: 560 } } } }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', px: 2.5, py: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id={titleId} variant="h6" component="h2" sx={{ wordBreak: 'break-word' }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', wordBreak: 'break-word' }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <DuncitIconButton aria-label={t('mcp.common.closeDetails')} onClick={onClose}>
          <CloseIcon />
        </DuncitIconButton>
      </Stack>
      <Divider />
      <Box sx={{ px: 2.5, py: 2, overflowY: 'auto' }}>{children}</Box>
    </Drawer>
  );
}
