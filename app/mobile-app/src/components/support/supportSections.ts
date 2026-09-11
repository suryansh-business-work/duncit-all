import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** Param-less support destinations reachable from the "More ways" grid. */
export type SupportRoute =
  'Sos' | 'Callback' | 'SupportTickets' | 'AllSupportTickets' | 'Feedback' | 'Grievance';

/** The tile's icon tone: the brand accent, or danger for the emergency entry. */
export type SupportTone = 'accent' | 'danger';

export interface SupportSection {
  key: string;
  title: string;
  icon: IconName;
  tone: SupportTone;
  route: SupportRoute;
  /** Localization key, preferred over the literal above when present. */
  titleKey?: string;
}

/**
 * "More ways to reach us" — the non-chat support tools. Chat is promoted to the
 * primary Start-a-conversation CTA, so it is excluded here. Order, copy and
 * tones mirror mWeb's SUPPORT_SECTIONS (minus the `live` chat entry).
 */
export const SUPPORT_MORE_WAYS: SupportSection[] = [
  {
    key: 'sos',
    title: 'SOS',
    icon: 'sos',
    tone: 'danger',
    route: 'Sos',
  },
  {
    key: 'callback',
    title: 'Callback Request',
    titleKey: 'mweb.common.callbackRequest',
    icon: 'phone-callback',
    tone: 'accent',
    route: 'Callback',
  },
  {
    key: 'tickets',
    title: 'Create Support Tickets',
    titleKey: 'mweb.common.createSupportTickets',
    icon: 'confirmation-number',
    tone: 'accent',
    route: 'SupportTickets',
  },
  {
    key: 'all',
    title: 'All Support Tickets',
    titleKey: 'mweb.common.allSupportTickets',
    icon: 'history',
    tone: 'accent',
    route: 'AllSupportTickets',
  },
  {
    key: 'grievance',
    title: 'Raise a Grievance',
    titleKey: 'grievance.title',
    icon: 'gavel',
    tone: 'accent',
    route: 'Grievance',
  },
  {
    key: 'feedback',
    title: 'Report a Problem',
    titleKey: 'mweb.common.reportAProblem',
    icon: 'feedback',
    tone: 'accent',
    route: 'Feedback',
  },
];
