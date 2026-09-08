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
import {
  REGION_POD_ATTENDEES,
  REGION_POD_AUDIT_TRAIL,
  REGION_POD_FEEDBACK,
  REGION_POD_HOST,
  REGION_POD_PAYMENTS,
} from './queries.regional';

/**
 * Who is reading this pod.
 *
 * ADMIN reads the platform-wide queries. CLUB_ADMIN and REGIONAL read scoped
 * twins of the same data — separate operations because neither is a role on the
 * user: a club admin is a MEMBERSHIP of a club, and a regional manager reaches
 * a pod through a CHAIN of them (their Club Admins -> those people's clubs ->
 * the pods in them). The server's `requireRole` can express neither, so the
 * admin operations refuse both outright.
 */
export type PodDetailsScope = 'ADMIN' | 'CLUB_ADMIN' | 'REGIONAL';

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

const REGIONAL_DOCS: ScopeDocuments = {
  scope: 'REGIONAL',
  attendees: REGION_POD_ATTENDEES,
  auditTrail: REGION_POD_AUDIT_TRAIL,
  feedback: REGION_POD_FEEDBACK,
  hostProfile: REGION_POD_HOST,
  payments: REGION_POD_PAYMENTS,
};

/** Scope -> the document set that scope is actually allowed to run. A lookup
 * rather than a chain of ternaries, so a fourth audience is one row. */
const DOCS_BY_SCOPE: Readonly<Record<PodDetailsScope, ScopeDocuments>> = {
  ADMIN: ADMIN_DOCS,
  CLUB_ADMIN: CLUB_ADMIN_DOCS,
  REGIONAL: REGIONAL_DOCS,
};

const PodDetailsScopeContext = createContext<ScopeDocuments>(ADMIN_DOCS);

/** Every self-fetching section reads its document from here rather than
 * importing one, which is what lets the same tree serve both portals. */
export const usePodDetailsScope = () => useContext(PodDetailsScopeContext);

export function PodDetailsScopeProvider({
  scope,
  children,
}: Readonly<{ scope: PodDetailsScope; children: ReactNode }>) {
  const value = useMemo(() => DOCS_BY_SCOPE[scope], [scope]);
  return (
    <PodDetailsScopeContext.Provider value={value}>{children}</PodDetailsScopeContext.Provider>
  );
}
