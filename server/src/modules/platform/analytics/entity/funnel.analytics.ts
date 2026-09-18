import { bucketSeries, type AnalyticsWindow } from './window';
import { loadCohort, type CohortMember } from './funnel.data';
import { cohortTable } from './funnel.cohorts';
import { consoleLink } from './links';
import {
  average,
  bandSlices,
  breakdown,
  kpi,
  linkEverything,
  pct,
  trend,
  type AnalyticsKpi,
  type Band,
  type EntityAnalyticsSections,
} from './shapes';

/**
 * Analytics > Growth > Funnel & Retention — the people who signed up in the
 * period, followed forward: did they come back, did they book, did they book
 * again, and how long did it take. Every figure is about THIS period's
 * sign-ups (the previous period's cohort for the comparison), so it reads as
 * "of the people who joined, how many…".
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const USERS = consoleLink('admin', '/users');
const PODS = consoleLink('admin', '/pods');

const DAYS_TO_BOOK: Band[] = [
  { key: 'fun_same_day', min: 0 },
  { key: 'fun_1_2_days', min: 1 },
  { key: 'fun_3_7_days', min: 3 },
  { key: 'fun_8_30_days', min: 8 },
  { key: 'fun_31_plus_days', min: 31 },
];

const BOOKINGS_BANDS: Band[] = [
  { key: 'fun_bookings_0', min: 0 },
  { key: 'fun_bookings_1', min: 1 },
  { key: 'fun_bookings_2_4', min: 2 },
  { key: 'fun_bookings_5_plus', min: 5 },
];

const cameBack = (member: CohortMember) => member.activeDays >= 2;
const booked = (member: CohortMember) => member.firstBookingAt !== null;
const bookedTwice = (member: CohortMember) => member.bookings >= 2;

const daysToBook = (members: readonly CohortMember[]) =>
  members.flatMap((member) =>
    member.firstBookingAt
      ? [Math.max(0, Math.floor((member.firstBookingAt.getTime() - member.signedUpAt.getTime()) / DAY_MS))]
      : []
  );

/** Each tile's value for one cohort — computed identically for both periods. */
function figures(members: readonly CohortMember[]) {
  const bookers = members.filter(booked).length;
  const twice = members.filter(bookedTwice).length;
  return {
    signups: members.length,
    bookers,
    return_rate: pct(members.filter(cameBack).length, members.length),
    first_booking_rate: pct(bookers, members.length),
    repeat_rate: pct(twice, bookers),
    signup_to_repeat: pct(twice, members.length),
    days_to_first_booking: average(daysToBook(members)),
  };
}

function funnelKpis(now: ReturnType<typeof figures>, before: ReturnType<typeof figures>): AnalyticsKpi[] {
  const rate = { format: 'PERCENT' } as const;
  return [
    kpi('fun_signups', now.signups, before.signups, { link: USERS }),
    kpi('fun_return_rate', now.return_rate, before.return_rate, rate),
    kpi('fun_bookers', now.bookers, before.bookers, { link: PODS }),
    kpi('fun_first_booking_rate', now.first_booking_rate, before.first_booking_rate, { ...rate, link: PODS }),
    kpi('fun_repeat_rate', now.repeat_rate, before.repeat_rate, { ...rate, link: PODS }),
    kpi('fun_signup_to_repeat', now.signup_to_repeat, before.signup_to_repeat, rate),
    kpi('fun_days_to_first_booking', now.days_to_first_booking, before.days_to_first_booking, {
      format: 'DAYS',
      higherIsBetter: false,
      link: PODS,
    }),
  ];
}

export async function funnelAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [current, previous] = await Promise.all([
    loadCohort(window.from, window.to),
    loadCohort(window.prevFrom, window.prevTo),
  ]);
  const signedUp = (member: CohortMember) => member.signedUpAt;
  const per = (reduce: (inBucket: CohortMember[]) => number) => bucketSeries(current, signedUp, window, reduce);
  const steps = [
    { key: 'fun_signed_up', label: null, value: current.length },
    { key: 'fun_came_back', label: null, value: current.filter(cameBack).length },
    { key: 'fun_booked_once', label: null, value: current.filter(booked).length },
    { key: 'fun_booked_twice', label: null, value: current.filter(bookedTwice).length },
  ];

  const sections: EntityAnalyticsSections = {
    kpis: funnelKpis(figures(current), figures(previous)),
    trends: [
      trend('fun_cohort', window, [
        { key: 'fun_signups', values: per((members) => members.length) },
        { key: 'fun_bookers', values: per((members) => members.filter(booked).length) },
      ]),
      trend(
        'fun_conversion',
        window,
        [
          { key: 'fun_return_rate', values: per((members) => pct(members.filter(cameBack).length, members.length)) },
          { key: 'fun_first_booking_rate', values: per((members) => pct(members.filter(booked).length, members.length)) },
        ],
        'PERCENT'
      ),
    ],
    breakdowns: [
      breakdown('fun_steps', steps, { ordered: true }),
      breakdown('fun_days_to_book', bandSlices(daysToBook(current), DAYS_TO_BOOK), { ordered: true, link: PODS }),
      breakdown('fun_bookings_per_member', bandSlices(current.map((member) => member.bookings), BOOKINGS_BANDS), {
        ordered: true,
        link: PODS,
      }),
    ],
    leaderboard: await cohortTable(current, window.zone, window.to),
  };
  return linkEverything(sections, USERS);
}
