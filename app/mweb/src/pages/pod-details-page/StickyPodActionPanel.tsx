import { useState } from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { podPhase } from '@duncit/utils';
import { APP_SHELL_MAX_WIDTH } from '../../app/appLayout';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useTranslation } from '../../i18n/useTranslation';
import PodActionPanel, { type PodActionPanelProps } from './PodActionPanel';

/** The booking bar: a floating 24px surface card above the bottom nav, price
 * or state on the left and the one green action on the right. A pod that has
 * already started asks "still want to join?" before Join / Book goes ahead.
 * Native twin: details/PodBookingBar (+ PodDetailsOverlays for the ask). */
export default function StickyPodActionPanel(props: Readonly<PodActionPanelProps>) {
  const { t } = useTranslation();
  const [pendingBook, setPendingBook] = useState<(() => void) | null>(null);
  const ongoing = podPhase(props.pod?.pod_date_time, props.pod?.pod_end_date_time) === 'ONGOING';
  // The setter takes an updater, so the handler is wrapped to be stored as-is.
  const askFirst = (book: () => void) => (ongoing ? () => setPendingBook(() => book) : book);
  const confirmBook = () => {
    const book = pendingBook;
    setPendingBook(null);
    book?.();
  };
  return (
    <Box
      data-testid="sticky-pod-action-panel"
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'calc(var(--duncit-bottom-nav-overlay-offset, 88px) + 8px)',
        zIndex: (theme) => theme.zIndex.appBar + 1,
        px: 2,
        pointerEvents: 'none',
      }}
    >
      {/* The whole bar, not just the Book button: which control sits here depends
          on whether the viewer is the host, already in, backing out or still
          deciding, and the tour describes the bar's job either way. */}
      <Box
        data-tour="pod-book"
        sx={{
          maxWidth: APP_SHELL_MAX_WIDTH,
          mx: 'auto',
          p: 1,
          borderRadius: '24px',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: (theme) => `0 8px 24px ${alpha(theme.palette.common.black, 0.12)}`,
          pointerEvents: 'auto',
        }}
      >
        <PodActionPanel
          {...props}
          onJoinFree={askFirst(props.onJoinFree)}
          onPaidCheckout={askFirst(props.onPaidCheckout)}
        />
      </Box>
      <ConfirmDialog
        open={pendingBook !== null}
        title={t('mweb.podDetails.ongoingJoinTitle')}
        message={t('mweb.podDetails.ongoingJoinBody')}
        confirmLabel={t('mweb.podDetails.ongoingJoinConfirm')}
        onConfirm={confirmBook}
        onClose={() => setPendingBook(null)}
        testId="ongoing-join-dialog"
      />
    </Box>
  );
}
