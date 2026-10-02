import {
  CLUB_SLOT_REQUEST_NOTICE_KEY,
  POD_ROW_STATUS_COLORS,
  canOpenPodAttendance,
  clubAdminVenueOptions,
  clubLacksOpenSlots,
  clubSlotsLabel,
  clubAdminGroupHeadings,
  clubAdminKpiGroups,
  clubAdminKpiLabels,
  clubAdminKpiValue,
  clubAdminLabels,
  clubAdminRangeFrom,
  clubAdminRangeLabels,
  clubAdminSeriesLabels,
  clubAdminTrendSeries,
  podAuditActionLabel,
  podAuditRiskLabel,
  podAuditSourceLabel,
  podRowStatus,
  podRowStatusLabel,
  podRowStatusOptions,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';
import type { ClubAdminMock } from './mocks';
import { clubAdminT } from './translators';

interface ClubSlotsMock {
  club_name: string;
  available_slots_count: number;
  pod_mode: 'PHYSICAL' | 'VIRTUAL';
  outcome: keyof typeof CLUB_SLOT_REQUEST_NOTICE_KEY;
}

export const clubAdminDemos: PackageDemo[] = [
  defineDemo<ClubAdminMock>({
    id: 'club-admin',
    title: 'What a club admin’s dashboard, pod rows and audit trail say',
    note:
      'The cards come back in the four groups the console draws, each written the way every surface writes it — ₹1,86,500, 75%, 4.4 (97). Change range to "all" and the from boundary the query takes turns null. Set is_deleted on the pod and it chips CANCELLED and loses its Pod Attendance action; set venue_approval_status to PENDING and it reads "Awaiting venue" in warning. Every word is the clubAdmin.* bundle’s own English, so mWeb and the native app cannot say it differently.',
    mock: {
      kpis: {
        assigned_clubs: 2,
        total_pods: 38,
        upcoming_pods: 5,
        completed_pods: 31,
        total_bookings: 412,
        backed_out: 17,
        total_attendees: 388,
        total_spots: 520,
        fill_rate: 0.746,
        total_followers: 1284,
        new_followers: 212,
        avg_rating: 4.36,
        ratings_count: 97,
        active_hosts: 6,
        total_revenue: 186500,
        currency_symbol: '₹',
      },
      range: '12m',
      now: '2026-09-03T10:00:00.000Z',
      pod: {
        pod_title: 'Sunday Long Run · Koramangala',
        is_active: true,
        completed_at: null,
        is_deleted: false,
        venue_approval_status: 'APPROVED',
      },
      audit: { action: 'UPDATE', source: 'CLUB_ADMIN', ai_risk: 'MEDIUM' },
      // Venues the club could book. Blank meetup_venues_id and every public
      // venue comes back — an unlinked club restricts nothing.
      meetup_venues_id: ['v-koramangala'],
      publicVenues: [
        { id: 'v-koramangala', venue_name: 'Cubbon Park Pavilion', is_active: true },
        { id: 'v-indiranagar', venue_name: 'Indiranagar Social', is_active: true },
      ],
      myVenues: [
        { id: 'v-mine', venue_name: 'My Rooftop', status: 'PENDING', is_active: true },
      ],
    },
    compute: (mock) => {
      const labels = clubAdminKpiLabels(clubAdminT);
      const headings = clubAdminGroupHeadings(clubAdminT);
      const seriesLabels = clubAdminSeriesLabels(clubAdminT);
      const status = podRowStatus(mock.pod);
      return {
        'Cards, by group': Object.fromEntries(
          clubAdminKpiGroups(mock.kpis).map((group) => [
            headings[group.key],
            group.cards.map(
              (card) => `${labels[card.key].label}: ${clubAdminKpiValue(card, mock.kpis.currency_symbol)}`
            ),
          ])
        ),
        'Range, as the select says it': clubAdminRangeLabels(clubAdminT)[mock.range],
        'from the query takes': clubAdminRangeFrom(mock.range, new Date(mock.now)) ?? '(none — all time)',
        'Trend lines': clubAdminTrendSeries.map((series) => `${seriesLabels[series.key]} on ${series.palette}`),
        'Pod row status': `${status} — "${podRowStatusLabel(status, clubAdminT)}" in ${POD_ROW_STATUS_COLORS[status]}`,
        'Offers Pod Attendance': canOpenPodAttendance(mock.pod),
        // One rule for mWeb, the Partners console and the app. A PENDING venue
        // of their own never reaches the picker; an unlinked club sees all.
        'Venues they may book': clubAdminVenueOptions(mock.publicVenues, mock.myVenues, {
          meetup_venues_id: mock.meetup_venues_id,
        }).map((venue) => venue.venue_name),
        'Status filter rows': podRowStatusOptions(clubAdminT).map((option) => option.label),
        'Audit entry reads': `${podAuditActionLabel(mock.audit.action, clubAdminT)} by ${podAuditSourceLabel(mock.audit.source, clubAdminT)} — AI risk ${podAuditRiskLabel(mock.audit.ai_risk, clubAdminT)}`,
        'Dashboard subtitle': clubAdminLabels(clubAdminT).dashboard.subtitle,
      };
    },
  }),

  defineDemo<ClubSlotsMock>({
    id: 'club-open-slots',
    title: 'Whether Create Pod lets a host pick a club with no open slots',
    note:
      'A physical pod books a venue slot, so a club whose venues have none open is stopped on step 1 and the host is offered a message to the club admin. Raise available_slots_count above 0, or switch pod_mode to VIRTUAL, and the club goes through. Change outcome to see which notice each answer from requestClubVenueSlots shows.',
    mock: {
      club_name: 'Noida Badminton Club',
      available_slots_count: 0,
      pod_mode: 'PHYSICAL',
      outcome: 'SENT',
    },
    compute: (mock) => ({
      'Stopped on step 1': clubLacksOpenSlots(mock, mock.pod_mode),
      'Slot line under the club': clubSlotsLabel(mock, clubAdminT).label,
      'Notice after messaging the admin': CLUB_SLOT_REQUEST_NOTICE_KEY[mock.outcome],
    }),
  }),
];
