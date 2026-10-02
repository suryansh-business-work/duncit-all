import { gql } from '@apollo/client';
import { format, parse } from 'date-fns';
import type { useTranslation } from '@duncit/app-settings';

// "HH:mm" string ↔ Date for the MUIX TimePicker (kept as strings for the API).
export const toTime = (hhmm: string): Date | null => {
  if (!hhmm) return null;
  const d = parse(hhmm, 'HH:mm', new Date());
  return Number.isNaN(d.getTime()) ? null : d;
};
export const fromTime = (d: Date | null): string =>
  d && !Number.isNaN(d.getTime()) ? format(d, 'HH:mm') : '';

export const AVAILABILITY = gql`
  query MeetingAvailability {
    meetingAvailability {
      id
      week_days
      start_time
      end_time
      slot_minutes
      horizon_days
      timezone_offset_minutes
    }
  }
`;
export const UPDATE = gql`
  mutation UpdateMeetingAvailability($input: MeetingAvailabilityInput!) {
    updateMeetingAvailability(input: $input) {
      id
      week_days
      start_time
      end_time
      slot_minutes
      horizon_days
    }
  }
`;

type Translate = ReturnType<typeof useTranslation>['t'];

export const days = (t: Translate) => [
  { value: 0, label: t('onboarding.meetings.sun') },
  { value: 1, label: t('onboarding.meetings.mon') },
  { value: 2, label: t('onboarding.meetings.tue') },
  { value: 3, label: t('onboarding.meetings.wed') },
  { value: 4, label: t('onboarding.meetings.thu') },
  { value: 5, label: t('onboarding.meetings.fri') },
  { value: 6, label: t('onboarding.meetings.sat') },
];
