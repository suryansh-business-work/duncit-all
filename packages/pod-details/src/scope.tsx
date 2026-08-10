import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { DocumentNode } from 'graphql';
import {
  POD_ATTENDEES_ADMIN,
  POD_AUDIT_TRAIL,
  POD_FEEDBACK_SUMMARY,
  POD_HOST_PROFILE,
  POD_PAYMENTS_TABLE,
} from './queries';
import {
  CLUB_ADMIN_POD_ATTENDEES,
  CLUB_ADMIN_POD_AUDIT_TRAIL,
  CLUB_ADMIN_POD_FEEDBACK,
  CLUB_ADMIN_POD_HOST,
  CLUB_ADMIN_POD_PAYMENTS,
} from './queries.club-admin';

/**
 * Who is reading this pod.
 *
 * ADMIN reads the platform-wide queries. CLUB_ADMIN reads club-scoped twins of
 * the same data — separate operations because CLUB_ADMIN is a MEMBERSHIP of a
 * club, not a role on the user, so the server's `requireRole` cannot express it
 * and the admin operations refuse them outright.
 */
export type PodDetailsScope = 'ADMIN' | 'CLUB_ADMIN';

interface ScopeDocuments {
  scope: PodDetailsScope;
  attendees: DocumentNode;
  auditTrail: DocumentNode;
  feedback: DocumentNode;
  hostProfile: DocumentNode;
  payments: DocumentNode;
}

const ADMIN_DOCS: ScopeDocuments = {
  scope: 'ADMIN',
  attendees: POD_ATTENDEES_ADMIN,
  auditTrail: POD_AUDIT_TRAIL,
  feedback: POD_FEEDBACK_SUMMARY,
  hostProfile: POD_HOST_PROFILE,
  payments: POD_PAYMENTS_TABLE,
};

const CLUB_ADMIN_DOCS: ScopeDocuments = {
  scope: 'CLUB_ADMIN',
  attendees: CLUB_ADMIN_POD_ATTENDEES,
  auditTrail: CLUB_ADMIN_POD_AUDIT_TRAIL,
  feedback: CLUB_ADMIN_POD_FEEDBACK,
  hostProfile: CLUB_ADMIN_POD_HOST,
  payments: CLUB_ADMIN_POD_PAYMENTS,
};

const PodDetailsScopeContext = createContext<ScopeDocuments>(ADMIN_DOCS);

/** Every self-fetching section reads its document from here rather than
 * importing one, which is what lets the same tree serve both portals. */
export const usePodDetailsScope = () => useContext(PodDetailsScopeContext);

export function PodDetailsScopeProvider({
  scope,
  children,
}: Readonly<{ scope: PodDetailsScope; children: ReactNode }>) {
  const value = useMemo(() => (scope === 'CLUB_ADMIN' ? CLUB_ADMIN_DOCS : ADMIN_DOCS), [scope]);
  return (
    <PodDetailsScopeContext.Provider value={value}>{children}</PodDetailsScopeContext.Provider>
  );
}
