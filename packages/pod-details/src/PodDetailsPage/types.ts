import type { ReactNode } from 'react';
import type { PodDetailsScope } from '../scope';

/** The pod as a header action needs it: which pod, what it is called, and
 * whether it is currently cancelled. */
export interface PodDetailsActionPod {
  id: string;
  pod_title: string;
  is_deleted: boolean;
}

/** An extra action rendered beside Edit, decided by the portal that mounts the
 * page rather than by this package: only the admin console may revoke a
 * cancellation, and only it knows the mutation. */
export type PodDetailsActions = (pod: PodDetailsActionPod) => ReactNode;

/** What a console with no action of its own passes. Required rather than
 * optional on purpose: an optional render prop is a branch this package would
 * never exercise on both sides, and the shared-package coverage gate counts it. */
export const NO_POD_ACTIONS: PodDetailsActions = () => null;

/** A block drawn under the header and above the columns — the first thing a
 * reader sees after the title. The admin portal puts the cancellation-risk
 * report here; every other console passes NO_POD_BANNER. Required for the
 * same reason `actions` is. */
export type PodDetailsBanner = (pod: PodDetailsActionPod) => ReactNode;

export const NO_POD_BANNER: PodDetailsBanner = () => null;

export interface PodDetailsViewProps {
  /** Who is reading — picks the admin or the club-scoped query set. */
  scope?: PodDetailsScope;
  /** Where Back goes. Defaults to the admin pods list. */
  backTo?: string;
  backLabel?: string;
  /** Where Edit goes. Omit to hide the action entirely — a reader whose portal
   * has no edit route should not be shown a button that goes nowhere. The
   * Regional Club Admin console is exactly that reader: it reads the region, it
   * does not run the pods in it. */
  editTo?: (podId: string) => string;
  /** Where a club admin's name links to. Omit on a portal with no user pages —
   * Club Admin's own console has none, and a name that navigates nowhere reads
   * as a broken page rather than as a missing feature. */
  userTo?: (userId: string) => string;
  /** Rendered in the header, beside Edit. The admin portal puts Revoke
   * cancellation here; every other console passes NO_POD_ACTIONS. */
  actions: PodDetailsActions;
  /** Rendered under the header, above everything else. The admin portal puts
   * the cancellation-risk report here; every other console passes NO_POD_BANNER. */
  banner: PodDetailsBanner;
  /** Rendered under the tables. The admin portal puts its coupons section here;
   * it stays out of this package because coupon management is platform-wide
   * (ADMIN_RW create/delete) and reaches into the admin coupons page. */
  footer?: (pod: { id: string; pod_title: string }) => ReactNode;
}
