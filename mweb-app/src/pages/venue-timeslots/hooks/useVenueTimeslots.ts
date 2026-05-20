import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  BLOCK_VENUE_TIMESLOT,
  CLEAR_VENUE_TIMESLOT_OVERRIDE,
  CREATE_VENUE_TIMESLOT_TEMPLATE,
  DELETE_VENUE_TIMESLOT_TEMPLATE,
  MY_VENUE_TIMESLOT_BLOCKS,
  MY_VENUE_TIMESLOT_TEMPLATES,
  OVERRIDE_VENUE_TIMESLOT_CAPACITY,
  SET_VENUE_TIMESLOT_TEMPLATE_ACTIVE,
  UNBLOCK_VENUE_TIMESLOT,
  UPDATE_VENUE_TIMESLOT_TEMPLATE,
  VENUE_TIMESLOT_INSTANCES,
} from '../queries';

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export function useVenueTimeslots(venueId: string | null) {
  const skip = !venueId;

  const today = useMemo(() => new Date(), []);
  const fourWeeksOut = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 28);
    return d;
  }, []);

  const templatesQuery = useQuery(MY_VENUE_TIMESLOT_TEMPLATES, {
    variables: { venue_id: venueId },
    skip,
    fetchPolicy: 'cache-and-network',
  });
  const blocksQuery = useQuery(MY_VENUE_TIMESLOT_BLOCKS, {
    variables: {
      venue_id: venueId,
      from: today.toISOString(),
      to: fourWeeksOut.toISOString(),
    },
    skip,
    fetchPolicy: 'cache-and-network',
  });
  const instancesQuery = useQuery(VENUE_TIMESLOT_INSTANCES, {
    variables: {
      venue_id: venueId,
      from: today.toISOString(),
      to: fourWeeksOut.toISOString(),
    },
    skip,
    fetchPolicy: 'cache-and-network',
  });

  const [createTemplate, createState] = useMutation(CREATE_VENUE_TIMESLOT_TEMPLATE);
  const [updateTemplate, updateState] = useMutation(UPDATE_VENUE_TIMESLOT_TEMPLATE);
  const [deleteTemplate] = useMutation(DELETE_VENUE_TIMESLOT_TEMPLATE);
  const [setActive] = useMutation(SET_VENUE_TIMESLOT_TEMPLATE_ACTIVE);
  const [blockSlot, blockState] = useMutation(BLOCK_VENUE_TIMESLOT);
  const [unblockSlot] = useMutation(UNBLOCK_VENUE_TIMESLOT);
  const [overrideCapacity, overrideState] = useMutation(OVERRIDE_VENUE_TIMESLOT_CAPACITY);
  const [clearOverride] = useMutation(CLEAR_VENUE_TIMESLOT_OVERRIDE);

  const refetchAll = async () => {
    await Promise.all([
      templatesQuery.refetch(),
      blocksQuery.refetch(),
      instancesQuery.refetch(),
    ]);
  };

  return {
    templates: templatesQuery.data?.myVenueTimeslotTemplates ?? [],
    blocks: blocksQuery.data?.myVenueTimeslotBlocks ?? [],
    instances: instancesQuery.data?.venueTimeslotInstances ?? [],
    loading: templatesQuery.loading || blocksQuery.loading || instancesQuery.loading,
    saving:
      createState.loading || updateState.loading || blockState.loading || overrideState.loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setActive,
    blockSlot,
    unblockSlot,
    overrideCapacity,
    clearOverride,
    refetchAll,
    range: { from: isoDay(today), to: isoDay(fourWeeksOut) },
  };
}
