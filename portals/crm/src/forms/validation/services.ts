import type { CrmServiceOffered } from '../../api/crm.types';

/** Form rows → API input: trimmed, rows with no service dropped. */
export const cleanServices = (services: CrmServiceOffered[] | undefined) =>
  (services ?? [])
    .filter((s) => s?.service?.trim())
    .map((s) => ({
      service: s.service.trim(),
      custom_name: (s.custom_name ?? '').trim(),
      description: (s.description ?? '').trim(),
    }));

/** API value → form rows (a lead saved before the field existed has none). */
export const servicesToForm = (services: CrmServiceOffered[] | null | undefined): CrmServiceOffered[] =>
  (services ?? []).map((s) => ({
    service: s.service,
    custom_name: s.custom_name ?? '',
    description: s.description ?? '',
  }));
