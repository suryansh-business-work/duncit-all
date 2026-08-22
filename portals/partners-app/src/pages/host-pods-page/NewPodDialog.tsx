import { useMemo, useState } from 'react';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { buildSlotLabels } from '@duncit/slots';
import { Alert, Dialog, DialogContent, DialogTitle } from '@mui/material';
import {
  PodForm,
  blankPodFormValues,
  useMediaPickerBridge,
  type PodFormValues,
} from '@duncit/pod-form';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { PARTNER_POD_CONFIG, getClubVenueIds } from '../pods-page/partner-pod-config';

interface Props {
  open: boolean;
  clubs: any[];
  venues: any[];
  products: any[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: PodFormValues, options: { draft: boolean }) => Promise<void>;
}

/** The same pod setup flow the admin panel uses — the host's approved profile
 * is attached as the pod host server-side. */
export default function NewPodDialog({
  open,
  clubs,
  venues,
  products,
  busy,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const fmt = useDateFormat();
  const { t } = useTranslation();
  const slotLabels = useMemo(() => buildSlotLabels(t, 'shell.slots'), [t]);
  const picker = useMediaPickerBridge();
  const [error, setError] = useState<string | null>(null);

  const submit = async (values: PodFormValues, options: { draft: boolean }) => {
    setError(null);
    try {
      await onSubmit(values, options);
    } catch (submitError: any) {
      setError(submitError.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('partners.common.newPod')}</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 1.5 }}>
          {t('partners.podsPage.yourApprovedHostProfileIsAdded')}
        </Alert>
        <PodForm
          initialValues={blankPodFormValues}
          config={PARTNER_POD_CONFIG}
          clubs={clubs}
          venues={venues}
          products={products}
          getClubVenueIds={getClubVenueIds}
          busy={busy}
          error={error}
          onCancel={onClose}
          onSubmit={submit}
          onPickImage={picker.pickImage}
          onPickVideo={picker.pickVideo}
          dateFormatter={fmt}
          slotLabels={slotLabels}
        />
      </DialogContent>
      <MediaPickerDialog
        open={picker.pickerOpen}
        onClose={() => picker.settlePicker(null)}
        onPicked={(url) => picker.settlePicker(url)}
        folder="/pods/media"
        title={picker.title}
        accept={picker.accept}
      />
    </Dialog>
  );
}
