/**
 * Bulk delete for the three telemetry tables — Logs, Bugs and Error Logs.
 *
 * One implementation because all three clear rows for the same reasons and had
 * better agree on what each gesture covers: the rows ticked on screen, every
 * row a filtered view is showing, or everything older than a date. The server
 * answers all three through one engine (rule 34/40); this is its console side.
 */
export { default as TelemetryBulkBar } from './TelemetryBulkBar';
export { default as TelemetryDeleteDialog } from './TelemetryDeleteDialog';
export { default as TelemetryDeleteButton } from './TelemetryDeleteButton';
export { scopeFromView, scopeIsEverything } from './queries';
export type { TelemetryDeleteScope, TelemetryDeleteTarget } from './queries';
export { useRunTelemetryDelete, useTelemetryDeleteCount } from './useTelemetryDelete';
export { useTelemetryTableSelection } from './useTelemetryTableSelection';
export type { TelemetryTableSelection } from './useTelemetryTableSelection';
