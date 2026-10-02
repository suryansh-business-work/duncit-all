import { AttendanceChip, PodSeatsCell } from '@duncit/ui';
import { formatDateTime } from '@duncit/app-settings';
import { podSeatsTaken } from '@duncit/utils';
import type { PodRowBase } from './types';

export const renderAttendance = (pod: PodRowBase) => <AttendanceChip attendance={pod.attendance} />;

export const dateValue = (pod: PodRowBase) =>
  formatDateTime(pod.pod_date_time) || 'Not scheduled';

/**
 * Seats, not bookings.
 *
 * A booking for seven writes ONE id into `pod_attendees`, so counting that
 * list told a host with a full pod that two people were coming. The cell shows
 * the seat count with the bookings behind it — the same component admin’s
 * Pods table renders, so the two portals cannot disagree about one pod.
 */
export const attendeesValue = (pod: PodRowBase) => podSeatsTaken(pod);

export const renderAttendees = (pod: PodRowBase) => (
  <PodSeatsCell
    seats={podSeatsTaken(pod)}
    bookings={pod.pod_attendees?.length ?? 0}
    total={pod.no_of_spots}
  />
);

export const getPodRowId = (pod: PodRowBase) => pod.id;
