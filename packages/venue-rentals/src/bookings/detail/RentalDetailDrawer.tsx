import { useId, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import type { UploadSurface } from '@duncit/media-picker';
import { parseApiError, type RentalBookingDetail, type RentalBookingRow } from '@duncit/utils';
import { RENTAL_BOOKING_DETAIL } from '../../documents';
import RentalDetailBody from './RentalDetailBody';
import RentalProofDialog from './RentalProofDialog';
import SendRentalRefundDialog from './SendRentalRefundDialog';
import type { RentalDetailLinks } from './types';

/** What the page mounting a board passes through to its rental detail. */
export interface RentalDetailOptions {
  links?: RentalDetailLinks;
  /** The Upload Settings surface the proof photo picker caps and compresses for. */
  uploadSurface?: UploadSurface;
}

interface Props extends RentalDetailOptions {
  /** The open rental, from the URL; null keeps the drawer shut. */
  rentalId: string | null;
  onClose: () => void;
  /** Puts the server's latest copy of the booking into the board's row. */
  onBookingChange: (row: RentalBookingRow) => void;
}

const NO_LINKS: RentalDetailLinks = {};

/**
 * One rental's detail in a right-hand drawer (full width on a phone). Its id
 * lives in the URL, so a reload or a shared link opens the same rental, and
 * what it shows is the server's FINANCE or VENUE view of it.
 */
export default function RentalDetailDrawer({ rentalId, onClose, onBookingChange, links = NO_LINKS, uploadSurface = 'PORTALS' }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const [dialog, setDialog] = useState<'proof' | 'refund' | null>(null);
  const { data, loading, error, refetch } = useQuery(RENTAL_BOOKING_DETAIL, {
    variables: { id: rentalId ?? '' },
    skip: !rentalId,
    fetchPolicy: 'cache-and-network',
  });
  // Never show the previous rental's detail while the next one loads.
  const loaded = data?.rentalBookingDetail;
  const detail = loaded && loaded.booking.id === rentalId ? loaded : null;

  const saved = (next: RentalBookingDetail) => onBookingChange(next.booking);
  // A failed retry keeps its own message: the newest refusal is the one shown.
  const [retryError, setRetryError] = useState<unknown>(null);
  const retry = () => {
    setRetryError(null);
    refetch().catch((failure: unknown) => setRetryError(failure));
  };

  return (
    <Drawer
      anchor="right"
      open={rentalId !== null}
      onClose={onClose}
      slotProps={{
        paper: { role: 'dialog', 'aria-modal': true, 'aria-labelledby': titleId, sx: { width: { xs: '100%', sm: 640 }, p: 2.5 } },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        <Typography component="h2" variant="h6" id={titleId} sx={{ fontWeight: 800, flex: 1, wordBreak: 'break-word' }}>
          {detail ? t('venueRentals.detail.title', { vars: { name: detail.booking.name } }) : t('venueRentals.detail.summary')}
        </Typography>
        <DuncitIconButton aria-label={t('venueRentals.detail.close')} onClick={onClose} data-testid="rental-detail-close">
          <CloseIcon />
        </DuncitIconButton>
      </Stack>
      {!detail && loading && (
        <Box role="status" sx={{ display: 'flex', justifyContent: 'center', py: 6 }} data-testid="rental-detail-loading">
          <CircularProgress aria-label={t('venueRentals.detail.loading')} />
        </Box>
      )}
      {!detail && !loading && error && (
        <Alert
          severity="error"
          data-testid="rental-detail-error"
          action={
            <DuncitButton color="inherit" size="small" onClick={retry}>
              {t('venueRentals.detail.retry')}
            </DuncitButton>
          }
        >
          {t('venueRentals.detail.loadError')}
          <Typography variant="body2" component="span" sx={{ display: 'block' }}>
            {parseApiError(retryError ?? error)}
          </Typography>
        </Alert>
      )}
      {detail && (
        <>
          <RentalDetailBody
            detail={detail}
            links={links}
            onAddProof={() => setDialog('proof')}
            onSendRefund={() => setDialog('refund')}
          />
          <RentalProofDialog
            open={dialog === 'proof'}
            booking={detail.booking}
            uploadSurface={uploadSurface}
            onClose={() => setDialog(null)}
            onSaved={saved}
          />
          <SendRentalRefundDialog open={dialog === 'refund'} detail={detail} onClose={() => setDialog(null)} onSent={saved} />
        </>
      )}
    </Drawer>
  );
}
