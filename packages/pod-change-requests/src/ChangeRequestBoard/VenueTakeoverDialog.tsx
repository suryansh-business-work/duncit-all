import { useMemo } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { WindowOfferForm, windowOfferDefaults, type WindowOfferInput } from '@duncit/availability-calendar';
import { DuncitButton } from '@duncit/buttons';
import type { PodChangeRow } from '@duncit/utils';
import { useTranslation } from '../i18n';
import { podChangeVenueQuoteSource } from '../queries';

interface Props {
  /** The VENUE request being taken over; null closes the dialog. */
  row: PodChangeRow | null;
  busy: boolean;
  onClose: () => void;
  /** Approves with the venue's window and terms (respondToPodChange venue_window). */
  onSubmit: (row: PodChangeRow, offer: WindowOfferInput) => Promise<void>;
}

/**
 * A venue takes a pod over by saying when it can run it — a time inside its
 * opening hours — and how it is paid. The server prices it (the venue's
 * charges, Duncit's commission on top) and books it at that price. The guests
 * are the pod's spots, so they are not asked for.
 */
export default function VenueTakeoverDialog({ row, busy, onClose, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const formId = `change-request-venue-${row?.id ?? 'none'}`;
  const quote = useMemo(() => podChangeVenueQuoteSource(row?.id ?? ''), [row?.id]);
  const defaults = useMemo(() => windowOfferDefaults(), []);

  return (
    <Dialog open={!!row} onClose={onClose} fullWidth maxWidth="sm" data-testid="change-request-venue-window">
      <DialogTitle>{t('changeRequest.venueWindowTitle')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {t('changeRequest.venueWindowHint')}
        </Typography>
        {row && (
          <WindowOfferForm
            key={formId}
            formId={formId}
            defaultValues={defaults}
            quote={quote}
            onSubmit={(offer) => onSubmit(row, offer)}
          />
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('changeRequest.venueWindowCancel')}</DuncitButton>
        <DuncitButton type="submit" form={formId} variant="contained" loading={busy} data-testid="change-request-venue-window-submit">
          {t('changeRequest.venueWindowSubmit')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
