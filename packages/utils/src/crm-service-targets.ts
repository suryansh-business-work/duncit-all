/**
 * CRM › Data › Services Offered: the lead kinds a service can be shown to, each
 * with the catalogue flag the server stores. One list drives the add/edit
 * switches, the list's "Applies to" chips and the lead-form picker — in the CRM
 * portal and the Duncit CRM app alike — so a kind added here reaches all of them.
 *
 * `defaultOn` mirrors the server: venue and host rows predate the flags and
 * count as on; every later kind is opt-in.
 */
export const CRM_SERVICE_TARGETS = [
  { kind: 'VENUE', flag: 'applies_to_venue', labelKey: 'crm.common.venue', defaultOn: true },
  { kind: 'HOST', flag: 'applies_to_host', labelKey: 'crm.common.host', defaultOn: true },
  { kind: 'ECOMM', flag: 'applies_to_ecomm', labelKey: 'crm.common.ecomm', defaultOn: false },
  { kind: 'CREATOR', flag: 'applies_to_creator', labelKey: 'crm.common.creator', defaultOn: false },
  { kind: 'COMMUNITY', flag: 'applies_to_community', labelKey: 'crm.common.community', defaultOn: false },
] as const;

export type CrmServiceTarget = (typeof CRM_SERVICE_TARGETS)[number];
export type CrmServiceTargetKind = CrmServiceTarget['kind'];
export type CrmServiceTargetFlag = CrmServiceTarget['flag'];
export type CrmServiceTargets = Record<CrmServiceTargetFlag, boolean>;

/** Every flag, each set by `on` — the one place the record is assembled from the list. */
const targetsFrom = (on: (target: CrmServiceTarget) => boolean): CrmServiceTargets =>
  // fromEntries cannot type its keys; the list above names every flag exactly once.
  Object.fromEntries(CRM_SERVICE_TARGETS.map((target) => [target.flag, on(target)])) as CrmServiceTargets;

/** The flags a new service starts with. */
export const crmDefaultServiceTargets = (): CrmServiceTargets => targetsFrom((target) => target.defaultOn);

/** Every kind on, or every kind off — the "All lead types" switch. */
export const crmAllServiceTargets = (on: boolean): CrmServiceTargets => targetsFrom(() => on);

/** Just the flags of a row (or draft) that carries them among other fields; anything not `true` is off. */
export const crmPickServiceTargets = (row: Partial<CrmServiceTargets>): CrmServiceTargets =>
  targetsFrom((target) => row[target.flag] === true);

/** A service must show on at least one lead form. */
export const crmHasAnyServiceTarget = (targets: CrmServiceTargets): boolean =>
  CRM_SERVICE_TARGETS.some((target) => targets[target.flag]);

/** The catalogue flag of a lead kind. */
export const crmServiceTargetFlag = (kind: CrmServiceTargetKind): CrmServiceTargetFlag =>
  CRM_SERVICE_TARGETS.find((target) => target.kind === kind)?.flag ?? 'applies_to_venue';

/**
 * The copy keys of the kinds a row shows on, in list order; every kind on
 * collapses to "All lead types", and none on is an empty list.
 */
export function crmServiceTargetLabelKeys(row: Partial<CrmServiceTargets>): string[] {
  const on = CRM_SERVICE_TARGETS.filter((target) => row[target.flag] === true);
  if (on.length === CRM_SERVICE_TARGETS.length) return ['crm.data.allLeadTypes'];
  return on.map((target) => target.labelKey);
}

/** Typed titles as they are saved: trimmed, blanks dropped, each title once (first one wins). */
export const crmNormalizeServiceTitles = (titles: readonly string[]): string[] =>
  Array.from(new Set(titles.map((title) => title.trim()).filter(Boolean)));
