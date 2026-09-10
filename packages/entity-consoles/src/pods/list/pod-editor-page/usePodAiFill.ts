import { useCallback, useRef } from 'react';
import { useApolloClient } from '@apollo/client/react';
import type { UseFormReturn } from 'react-hook-form';
import { VENUE_AVAILABLE_SLOTS, type PodFormConfig, type PodFormValues } from '@duncit/pod-form';
import { buildAiFilledPod, type AvailableSlot } from '../podFormAi';

interface Args {
  config: PodFormConfig;
  clubs: any[];
  venues: any[];
  /** Host-column options — approved hosts only. */
  hosts: any[];
  getClubVenueIds: (club: any) => string[];
}

/** Admin AI-fill wiring for the pod editor: holds the form's RHF methods and
 * books a real venue slot so the picker shows the fill as selected. */
export default function usePodAiFill({ config, clubs, venues, hosts, getClubVenueIds }: Args) {
  const client = useApolloClient();
  const methodsRef = useRef<UseFormReturn<PodFormValues> | null>(null);

  // The same query the slot calendar runs, so the slot an AI fill books is one
  // the picker then shows as selected.
  const fetchSlots = useCallback(
    async (venueId: string): Promise<AvailableSlot[]> => {
      const { data } = await client.query<any>({
        query: VENUE_AVAILABLE_SLOTS,
        variables: { venue_id: venueId, from: new Date().toISOString() },
        fetchPolicy: 'network-only',
      });
      return data?.venueAvailableSlots ?? [];
    },
    [client],
  );

  const handleAiFill = async (filled: any) => {
    const methods = methodsRef.current;
    if (!methods) return;
    const lookups = {
      clubs,
      venues,
      hosts,
      clubVenueIds: getClubVenueIds,
      slotDrivenDates: config.showVenueSlot,
    };
    const next = await buildAiFilledPod(filled, methods.getValues(), lookups, fetchSlots);
    // Defaults stay the pod's own: the slot picker reads them to keep offering
    // the slot an edited pod already booked.
    methods.reset(next, { keepDefaultValues: true });
  };

  const onReady = (methods: UseFormReturn<PodFormValues>) => {
    methodsRef.current = methods;
  };

  return { onReady, handleAiFill };
}
