import { ReactNode } from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  SwipeableDrawer,
  Stack,
  useMediaQuery,
} from '@mui/material';
import { useTheme, type SxProps, type Theme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitRoundButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import { RADIUS } from '../theme';

/** A plain-string title reads at the dialog title's 18/600; a caller's own
 * Typography keeps its variant. */
const TITLE_TEXT_SX = { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.3 } as const;

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
  /** Bottom-sheet height (mobile only) — defaults to auto/85dvh max. */
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
  sheetMaxHeight = '85dvh',
  actions,
  paperSx,
  contentSx,
  actionsSx,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();
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
        slotProps={{
          paper: {
            sx: mergeSx({
              borderTopLeftRadius: `${RADIUS.dialog}px`,
              borderTopRightRadius: `${RADIUS.dialog}px`,
              maxHeight: sheetMaxHeight,
              display: 'flex',
              flexDirection: 'column',
              pb: 'env(safe-area-inset-bottom)',
            }, paperSx),
          }
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
            spacing={1.5}
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              px: 2.5,
              pt: 1,
              pb: 1,
              flex: '0 0 auto'
            }}>
            <Box sx={{ minWidth: 0, flex: 1, ...TITLE_TEXT_SX }}>{title}</Box>
            <DuncitRoundButton tone="surface" onClick={onClose} aria-label={t('mweb.common.close')}>
              <CloseIcon />
            </DuncitRoundButton>
          </Stack>
        )}
        <Box sx={mergeSx({ flex: 1, overflowY: 'auto', px: 2.5, pt: 0.5, pb: 1 }, contentSx)}>{children}</Box>
        {actions && (
          <Box
            sx={mergeSx({
              flex: '0 0 auto',
              px: 2.5,
              pt: 1,
              pb: 2.5,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1.5,
            }, actionsSx)}
          >
            {actions}
          </Box>
        )}
      </SwipeableDrawer>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth={fullWidth} maxWidth={maxWidth} slotProps={{
      paper: { sx: paperSx }
    }}>
      {title && (
        <DialogTitle sx={{ pr: 8, ...TITLE_TEXT_SX }}>
          {title}
          <DuncitRoundButton
            tone="surface"
            onClick={onClose}
            sx={{ position: 'absolute', right: 16, top: 14 }}
            aria-label={t('mweb.common.close')}
          >
            <CloseIcon />
          </DuncitRoundButton>
        </DialogTitle>
      )}
      <DialogContent sx={mergeSx({ py: 1.5 }, contentSx)}>{children}</DialogContent>
      {actions && <DialogActions sx={mergeSx({ px: 3, pb: 2.5 }, actionsSx)}>{actions}</DialogActions>}
    </Dialog>
  );
}
