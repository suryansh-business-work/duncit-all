import { useCallback, useMemo, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import type { UseFormReturn } from 'react-hook-form';
import {
  PodEditorDialog,
  VENUE_AVAILABLE_SLOTS,
  type PodFormConfig,
  type PodFormValues,
} from '@duncit/pod-form';
import AiFillButton from '../../components/AiFillButton';
import { buildAiFilledPod, type AvailableSlot } from './podFormAi';
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
  const client = useApolloClient();
  const slotLabels = useMemo(() => buildSlotLabels(t, 'shell.slots'), [t]);

  // The same query the slot calendar runs, so the slot an AI fill books is one
  // the picker then shows as selected.
  const fetchSlots = useCallback(
    async (venueId: string): Promise<AvailableSlot[]> => {
      const { data } = await client.query({
        query: VENUE_AVAILABLE_SLOTS,
        variables: { venue_id: venueId, from: new Date().toISOString() },
        fetchPolicy: 'network-only',
      });
      return data?.venueAvailableSlots ?? [];
    },
    [client],
  );

  const handleAiFill = async (d: any) => {
    const methods = methodsRef.current;
    if (!methods) return;
    const lookups = {
      clubs,
      venues,
      hosts,
      clubVenueIds: getClubVenueIds,
      slotDrivenDates: config.showVenueSlot,
    };
    const next = await buildAiFilledPod(d, methods.getValues(), lookups, fetchSlots);
    // Defaults stay the pod's own: the slot picker reads them to keep offering
    // the slot an edited pod already booked.
    methods.reset(next, { keepDefaultValues: true });
  };

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
      dateFormatter={fmt}
      slotLabels={slotLabels}
      onSubmit={onSubmit}
      onReady={(methods) => {
        methodsRef.current = methods;
      }}
      hideDraftOnEdit
      titleExtras={<AiFillButton entity="POD" onFill={handleAiFill} />}
    />
  );
}
