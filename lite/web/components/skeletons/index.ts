/**
 * Lite's loading placeholders. Each page draws one shaped like itself (next to
 * the page) from these pieces; QueryGuard's `skeleton` and SignedInGate's
 * `skeleton` show it in place of a spinner. Every skeleton sits in a
 * SkeletonFrame, so a screen reader still hears one "Loading…".
 */
export { EventCardSkeleton, EventGroupsSkeleton, EventListSkeleton } from './EventListSkeleton';
export { ListRowsSkeleton } from './ListRowsSkeleton';
export { FormSkeleton, PageSkeleton, ShellSkeleton } from './PageSkeleton';
export { Dot, Shape, SkeletonFrame, TextLine, slots } from './shapes';
