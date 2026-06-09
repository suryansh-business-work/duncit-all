import { ReactNode } from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  SwipeableDrawer,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  desktopOnly?: boolean;
  bottomSheetOnly?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullWidth?: boolean;
  sheetMaxHeight?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Dialog on desktop (>= sm), bottom-sheet on mobile. Use everywhere
 * across the admin to guarantee a native-feeling sheet on small screens.
 */
export default function ResponsiveDialog({
  open,
  onClose,
  title,
  desktopOnly,
  bottomSheetOnly,
  maxWidth = 'sm',
  fullWidth = true,
  sheetMaxHeight = '85vh',
  actions,
  children,
}: Readonly<Props>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const useSheet = bottomSheetOnly || (!desktopOnly && isMobile);

  if (useSheet) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        onOpen={() => {}}
        disableSwipeToOpen
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: sheetMaxHeight,
            display: 'flex',
            flexDirection: 'column',
            pb: 'env(safe-area-inset-bottom)',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 0.5 }}>
          <Box sx={{ width: 38, height: 4, bgcolor: 'divider', borderRadius: 999 }} />
        </Box>
        {title && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, pt: 0.5, pb: 1 }}
          >
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ minWidth: 0 }}>
              {title}
            </Typography>
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>{children}</Box>
        {actions && (
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1,
            }}
          >
            {actions}
          </Box>
        )}
      </SwipeableDrawer>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth={fullWidth} maxWidth={maxWidth}>
      {title && (
        <DialogTitle sx={{ pr: 6 }}>
          {title}
          <IconButton
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
            size="small"
            aria-label="Close"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
      )}
      <DialogContent dividers={!!actions}>{children}</DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  );
}
