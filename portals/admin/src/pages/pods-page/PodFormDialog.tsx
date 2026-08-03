import { useMemo, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { PodEditorDialog, type PodFormConfig, type PodFormValues } from '@duncit/pod-form';
import AiFillButton from '../../components/AiFillButton';
import { applyAiFillToForm } from './podFormAi';
import { MEETING_PLATFORMS, generateMeetingLink } from './meeting-platforms';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { buildSlotLabels } from '@duncit/slots';

interface Props {
  open: boolean;
  editing: boolean;
  onClose: () => void;
  initialValues: PodFormValues;
  config: PodFormConfig;
  busy: boolean;
  opError: string | null;
  clubs: any[];
  venues: any[];
  inventoryProducts: any[];
  /** Host-column options — approved hosts only. */
  hosts: any[];
  onSubmit: (values: PodFormValues, options: { draft: boolean }) => Promise<void> | void;
  finance?: { platform_fee_pct: number; gst_pct: number; currency_symbol?: string };
  onPickImage: () => Promise<string | null>;
  onPickVideo: () => Promise<string | null>;
}

const getClubVenueIds = (club: any): string[] => (club?.matched_venues ?? []).map((v: any) => v.id);

/** Admin pod editor: the shared dialog + AI-fill, meeting links and date format. */
export default function PodFormDialog({
  open,
  editing,
  onClose,
  initialValues,
  config,
  busy,
  opError,
  clubs,
  venues,
  inventoryProducts,
  hosts,
  onSubmit,
  finance,
  onPickImage,
  onPickVideo,
}: Readonly<Props>) {
  const methodsRef = useRef<UseFormReturn<PodFormValues> | null>(null);
  const fmt = useDateFormat();
  const { t } = useTranslation();
  const slotLabels = useMemo(() => buildSlotLabels(t, 'shell.slots'), [t]);

  return (
    <PodEditorDialog
      open={open}
      editing={editing}
      onClose={onClose}
      initialValues={initialValues}
      config={config}
      busy={busy}
      error={opError}
      clubs={clubs}
      venues={venues}
      users={hosts}
      products={inventoryProducts}
      finance={finance}
      getClubVenueIds={getClubVenueIds}
      meetingPlatforms={[...MEETING_PLATFORMS]}
      onGenerateMeetingLink={generateMeetingLink}
      onPickImage={onPickImage}
      onPickVideo={onPickVideo}
      dateTimeFormat={`${fmt.dateFormat} ${fmt.timeFormat}`}
      dateFormatter={fmt}
      slotLabels={slotLabels}
      onSubmit={onSubmit}
      onReady={(methods) => {
        methodsRef.current = methods;
      }}
      hideDraftOnEdit
      titleExtras={
        <AiFillButton
          entity="POD"
          onFill={(d: any) => {
            const methods = methodsRef.current;
            if (!methods) return;
            applyAiFillToForm(d, methods.getValues(), (next) => methods.reset(next));
          }}
        />
      }
    />
  );
}
