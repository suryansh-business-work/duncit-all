import { useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';
import { PodForm, type PodFormConfig, type PodFormValues } from '@duncit/pod-form';
import AiFillButton from '../../components/AiFillButton';
import { applyAiFillToForm } from './podFormAi';
import { MEETING_PLATFORMS, generateMeetingLink } from './meeting-platforms';
import { useDateFormat } from '../../utils/dateFormat';

interface Props {
  open: boolean;
  onClose: () => void;
  initialValues: PodFormValues;
  config: PodFormConfig;
  busy: boolean;
  opError: string | null;
  clubs: any[];
  venues: any[];
  inventoryProducts: any[];
  users: any[];
  onSubmit: (values: PodFormValues, options: { draft: boolean }) => Promise<void> | void;
  finance?: { platform_fee_pct: number; gst_pct: number; currency_symbol?: string };
  onPickImage: () => Promise<string | null>;
}

const getClubVenueIds = (club: any): string[] => (club?.matched_venues ?? []).map((v: any) => v.id);

export default function PodFormDialog({
  open,
  onClose,
  initialValues,
  config,
  busy,
  opError,
  clubs,
  venues,
  inventoryProducts,
  users,
  onSubmit,
  finance,
  onPickImage,
}: Readonly<Props>) {
  const isEdit = !!initialValues.pod_id;
  const methodsRef = useRef<UseFormReturn<PodFormValues> | null>(null);
  const { dateFormat, timeFormat } = useDateFormat();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <span>{isEdit ? 'Edit Pod' : 'New Pod'}</span>
        <AiFillButton
          entity="POD"
          onFill={(d: any) => {
            const methods = methodsRef.current;
            if (!methods) return;
            applyAiFillToForm(d, methods.getValues(), (next) => methods.reset(next));
          }}
        />
      </DialogTitle>
      <DialogContent dividers>
        <PodForm
          initialValues={initialValues}
          config={config}
          clubs={clubs}
          venues={venues}
          users={users}
          products={inventoryProducts}
          finance={finance}
          getClubVenueIds={getClubVenueIds}
          meetingPlatforms={[...MEETING_PLATFORMS]}
          onGenerateMeetingLink={generateMeetingLink}
          onPickImage={onPickImage}
          dateTimeFormat={`${dateFormat} ${timeFormat}`}
          busy={busy}
          error={opError}
          onCancel={onClose}
          onSubmit={onSubmit}
          onReady={(methods) => {
            methodsRef.current = methods;
          }}
          hideDraftOnEdit
        />
      </DialogContent>
    </Dialog>
  );
}
