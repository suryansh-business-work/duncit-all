import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import type { UploadSurface } from '@duncit/media-picker';
import type { RentalBookingDetail, RentalBookingRow } from '@duncit/utils';
import { ADD_RENTAL_BOOKING_PROOF } from '../../documents';
import AddProofForm, { type RentalProofOutput } from '../add-proof';
import { useApiError, writeRentalDetail } from './useDetailMutation';

interface Props {
  open: boolean;
  booking: RentalBookingRow;
  uploadSurface: UploadSurface;
  onClose: () => void;
  /** The server's detail after the proof, for the drawer and the board's row. */
  onSaved: (detail: RentalBookingDetail) => void;
}

const TITLE_ID = 'rental-proof-title';

/** Finance or the venue attaches an optional note and photos to a rental. */
export default function RentalProofDialog({ open, booking, uploadSurface, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const { apiError, clear, fail } = useApiError();
  const [addProof, { loading }] = useMutation(ADD_RENTAL_BOOKING_PROOF, {
    update: (cache, { data }) => writeRentalDetail(cache, data?.addRentalBookingProof),
  });

  const close = () => {
    clear();
    onClose();
  };

  const submit = async (values: RentalProofOutput) => {
    clear();
    try {
      const res = await addProof({ variables: { id: booking.id, input: { note: values.note, image_urls: values.image_urls } } });
      const saved = res.data?.addRentalBookingProof;
      if (!saved) return;
      notifySuccess(t('venueRentals.proof.saved'));
      onSaved(saved);
      close();
    } catch (error) {
      fail(error);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={TITLE_ID}>
      <DialogTitle id={TITLE_ID}>{t('venueRentals.proof.title', { vars: { name: booking.name } })}</DialogTitle>
      <DialogContent dividers>
        {open && (
          <AddProofForm
            booking={booking}
            uploadSurface={uploadSurface}
            busy={loading}
            errorMessage={apiError}
            onSubmit={submit}
            onCancel={close}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
