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
  useMediaQuery,
} from '@mui/material';
import { useTheme, type SxProps, type Theme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Forces dialog mode regardless of viewport. */
  desktopOnly?: boolean;
  /** Forces bottom-sheet mode regardless of viewport. */
  bottomSheetOnly?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullWidth?: boolean;
  /** Bottom-sheet height (mobile only) — defaults to auto/85vh max. */
  sheetMaxHeight?: string;
  actions?: ReactNode;
  paperSx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
  actionsSx?: SxProps<Theme>;
  children: ReactNode;
}

function mergeSx(base: SxProps<Theme>, extra?: SxProps<Theme>): SxProps<Theme> {
  return extra ? [base, ...(Array.isArray(extra) ? extra : [extra])] : base;
}

/**
 * Dialog on desktop (>= sm), bottom-sheet (SwipeableDrawer anchor=bottom)
 * on mobile. Drop-in replacement for MUI Dialog: `open`, `onClose`,
 * `title`, optional `actions`, content as children.
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
  paperSx,
  contentSx,
  actionsSx,
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
          sx: mergeSx({
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: sheetMaxHeight,
            display: 'flex',
            flexDirection: 'column',
            pb: 'env(safe-area-inset-bottom)',
          }, paperSx),
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            pt: 1,
            pb: 0.5,
            flex: '0 0 auto',
          }}
        >
          <Box
            sx={{
              width: 38,
              height: 4,
              bgcolor: 'divider',
              borderRadius: 999,
            }}
          />
        </Box>
        {title && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, pt: 0.5, pb: 0.5, flex: '0 0 auto' }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>{title}</Box>
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
        <Box sx={mergeSx({ flex: 1, overflowY: 'auto', px: 2, pt: 0.5, pb: 1 }, contentSx)}>{children}</Box>
        {actions && (
          <Box
            sx={mergeSx({
              flex: '0 0 auto',
              px: 2,
              py: 0.75,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1,
            }, actionsSx)}
          >
            {actions}
          </Box>
        )}
      </SwipeableDrawer>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth={fullWidth} maxWidth={maxWidth} PaperProps={{ sx: paperSx }}>
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
      <DialogContent dividers={!!actions} sx={mergeSx({ py: 1.5 }, contentSx)}>{children}</DialogContent>
      {actions && <DialogActions sx={actionsSx}>{actions}</DialogActions>}
    </Dialog>
  );
}
