import {
  POD_FEEDBACK_REMINDER_OPTIONS,
  buildPodFeedbackInput,
  attendanceRowState,
  canDirectMark,
  canScanTickets,
  canSubmitPodFeedback,
  earningsBodyFor,
  matchAttendanceRows,
  mwebAttendanceLabels,
  namedCompanionEntries,
  needsOtp,
  showsCompleteDeadline,
  orderedAspects,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';
import type { PodFeedbackMock, AttendanceBoardMock } from './mocks';

export const feedbackAndAttendanceDemos: PackageDemo[] = [
  defineDemo<PodFeedbackMock>({
    id: 'pod-feedback',
    title: 'The post-pod rating prompt, and the way out of it',
    note:
      'Drop `OVERALL` to 0 and Submit locks — it is the only required score. Score FOOD 0 ' +
      'and it leaves the payload entirely: "not scored" and "scored badly" are different ' +
      'answers. `closedWith` is what the Close button writes: LATER snoozes this pod, NEVER ' +
      'retires it, and either way the server remembers, so a reload does not ask again.',
    mock: {
      // Exactly what myPendingPodFeedback answers for a pod at a real venue.
      title: 'Sunday Chess & Filter Coffee',
      serverAspects: ['OVERALL', 'HOST', 'VENUE', 'SAFETY', 'FOOD', 'OTHER'],
      scores: { OVERALL: 4, HOST: 5, VENUE: 3, FOOD: 0 },
      message: '  Great host, room was a bit loud.  ',
      closedWith: 'LATER',
    },
    compute: (mock) => {
      const aspects = orderedAspects(mock.serverAspects);
      const chosen = POD_FEEDBACK_REMINDER_OPTIONS.find((o) => o.choice === mock.closedWith);
      return {
        Asked: aspects.join(' → '),
        'Submit enabled': String(canSubmitPodFeedback(mock.scores)),
        Payload: JSON.stringify(
          buildPodFeedbackInput({
            podId: 'DUN-POD-4821',
            scores: mock.scores,
            message: mock.message,
            aspects,
          })
        ),
        'Close offers': POD_FEEDBACK_REMINDER_OPTIONS.map((o) => o.labelKey).join(', '),
        'Close writes': chosen ? chosen.choice : '(not one of the two options)',
      };
    },
  }),
  defineDemo<AttendanceBoardMock>({
    id: 'pod-attendance',
    title: 'What the attendance board offers its host',
    note:
      'Flip pod_mode to VIRTUAL: the scanner disappears and the earnings sentence changes. ' +
      'canScanTickets decides whether the scan dialog is MOUNTED, not merely hidden — it reads ' +
      'the host-actions config, which a console with no host area never supplies. ' +
      'Now set viewer to CLUB_ADMIN with companions_required above 0: the row state flips from ' +
      'NEEDS_COMPANIONS to READY, because naming the group is the HOST’s door step and the ' +
      'admin is correcting the roster long after that door shut. needsOtp also answers false for ' +
      'them — not because they cannot send a code, but because they are never made to. ' +
      'Set lock to EXPIRED: the host’s completion window ran out, the deadline banner gives way ' +
      'to the locked notice, and only a Club Admin can still record who came. ' +
      'With viewer CLUB_ADMIN the page also carries a Direct attendance mark button ' +
      '(canDirectMark) — type into search and matchAttendanceRows narrows the pod’s bookings: ' +
      '`rohan` finds PRIYA’s booking, because Rohan is a seat on it, and `98200` finds Arjun ' +
      'even though he is already marked.',
    mock: {
      pod_id: 'DUN-POD-4821',
      viewer: 'HOST',
      can_mark: true,
      otp_required: true,
      pod_mode: 'PHYSICAL',
      lock: 'OPEN',
      complete_deadline: '2026-08-31T14:00:00.000Z',
      companions_required: 7,
      search: 'pri',
    },
    compute: (mock) => {
      // Keys rather than copy, so the demo names WHICH sentence each surface renders.
      const labels = mwebAttendanceLabels((key) => key);
      const door = mock.pod_mode === 'VIRTUAL' ? 'VIRTUAL_JOIN' : 'HOST_SCAN';
      const scanCta = canScanTickets(mock) ? labels.scanCta : '(hidden)';
      const row = { attended: false, companions_required: mock.companions_required };
      // One booking per person, as the roster holds them — Priya's admits two,
      // and the second seat is named rather than counted.
      const roster = [
        {
          membership_id: 'm1',
          name: 'Priya Sharma',
          email: 'priya@example.com',
          ticket_code: 'DUN-TKT-4821',
          phone_extension: '+91',
          phone_number: '8791234693',
          attended: false,
          companions: [{ name: 'Rohan Mehta' }],
        },
        {
          membership_id: 'm2',
          name: 'Arjun Nair',
          email: 'arjun@example.com',
          ticket_code: 'DUN-TKT-4830',
          phone_extension: '+91',
          phone_number: '9820011223',
          attended: true,
          companions: [],
        },
      ];
      const found = matchAttendanceRows(roster, mock.search);
      return {
        'needsOtp(board)': needsOtp(mock),
        'canDirectMark(board)': canDirectMark(mock),
        'matchAttendanceRows(roster, search)':
          found.map((r) => r.name).join(', ') || '(no booking matches)',
        'canScanTickets(board)': canScanTickets(mock),
        'showsCompleteDeadline(board)': showsCompleteDeadline(mock),
        'Locked notice': labels.lockedTitle(mock.lock),
        'earningsBodyFor(board, labels)': earningsBodyFor(mock, labels),
        'Scan CTA': scanCta,
        'How a member gets marked': labels.methodLabel(door),
        'attendanceRowState(row, can_mark, viewer)': attendanceRowState(
          row,
          mock.can_mark,
          mock.viewer
        ),
        'namedCompanionEntries(what the admin was read)': namedCompanionEntries([
          { name: 'Ishita Rao', phone_extension: '+91', phone_number: '9876543210' },
          { name: 'Kabir Shah', phone_extension: '+91', phone_number: '' },
          { name: '', phone_extension: '+91', phone_number: '' },
        ]),
      };
    },
  }),

];
