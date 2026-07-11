import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** Param-less support destinations reachable from the "More ways" grid. */
export type SupportRoute = 'Sos' | 'Callback' | 'SupportTickets' | 'AllSupportTickets';

export interface SupportSection {
  key: string;
  title: string;
  desc: string;
  icon: IconName;
  /** Per-section accent (mirrors mWeb's SUPPORT_SECTIONS colours). */
  color: string;
  route: SupportRoute;
}

/**
 * "More ways to reach us" — the non-chat support tools. Chat is promoted to the
 * primary Start-a-conversation CTA, so it is excluded here. Order, copy and
 * colours mirror mWeb's SUPPORT_SECTIONS (minus the `live` chat entry).
 */
export const SUPPORT_MORE_WAYS: SupportSection[] = [
  {
    key: 'sos',
    title: 'SOS',
    desc: 'Emergency help at your live pod',
    icon: 'sos',
    color: '#f44336',
    route: 'Sos',
  },
  {
    key: 'callback',
    title: 'Callback Request',
    desc: 'Call us or get a callback',
    icon: 'phone-callback',
    color: '#2196f3',
    route: 'Callback',
  },
  {
    key: 'tickets',
    title: 'Create Support Tickets',
    desc: 'Raise an issue with our team',
    icon: 'confirmation-number',
    color: '#ff4f73',
    route: 'SupportTickets',
  },
  {
    key: 'all',
    title: 'All Support Tickets',
    desc: 'Every request you have raised, in one list',
    icon: 'history',
    color: '#7c5cff',
    route: 'AllSupportTickets',
  },
];
