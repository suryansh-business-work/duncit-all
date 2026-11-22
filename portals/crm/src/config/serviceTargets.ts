/**
 * The lead kinds a Service Offered can be shown to (CRM › Data › Services
 * Offered), each with the catalogue flag the server stores. One list drives the
 * add/edit switches, the table's "Applies to" column and the lead-form picker,
 * so a kind added here reaches all three.
 *
 * `defaultOn` mirrors the server: venue and host rows predate the flags and
 * count as on; every later kind is opt-in.
 */
export const SERVICE_TARGETS = [
  { kind: 'VENUE', flag: 'applies_to_venue', labelKey: 'crm.common.venue', defaultOn: true },
  { kind: 'HOST', flag: 'applies_to_host', labelKey: 'crm.common.host', defaultOn: true },
  { kind: 'ECOMM', flag: 'applies_to_ecomm', labelKey: 'crm.common.ecomm', defaultOn: false },
  { kind: 'CREATOR', flag: 'applies_to_creator', labelKey: 'crm.common.creator', defaultOn: false },
  { kind: 'COMMUNITY', flag: 'applies_to_community', labelKey: 'crm.common.community', defaultOn: false },
] as const;

export type ServiceTargetKind = (typeof SERVICE_TARGETS)[number]['kind'];
export type ServiceTargetFlag = (typeof SERVICE_TARGETS)[number]['flag'];
export type ServiceTargets = Record<ServiceTargetFlag, boolean>;

/** The flags a new service starts with. */
export const defaultServiceTargets = (): ServiceTargets =>
  Object.fromEntries(SERVICE_TARGETS.map((t) => [t.flag, t.defaultOn])) as ServiceTargets;

/** Just the flags of a row (or draft) that carries them among other fields. */
export const pickServiceTargets = (row: Partial<ServiceTargets>): ServiceTargets =>
  Object.fromEntries(SERVICE_TARGETS.map((t) => [t.flag, row[t.flag] === true])) as ServiceTargets;

export const hasAnyTarget = (targets: ServiceTargets): boolean => SERVICE_TARGETS.some((t) => targets[t.flag]);

export const flagForKind = (kind: ServiceTargetKind): ServiceTargetFlag =>
  SERVICE_TARGETS.find((t) => t.kind === kind)?.flag ?? 'applies_to_venue';
