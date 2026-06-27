import type { FieldErrors } from 'react-hook-form';

/**
 * Accepts either a react-hook-form `FieldErrors` tree (leaves are
 * `{ message }` objects) or a plain nested string-error map (used by the
 * focused unit tests). Both are walked the same way.
 */
type ErrorTree = FieldErrors<any> | Record<string, unknown>;

const LABELS: Record<string, string> = {
  venue_name: 'Venue name',
  venue_types: 'Venue types',
  city: 'City',
  area: 'Area',
  full_address: 'Full address',
  contacts: 'Contacts',
  'contacts[0].name': 'Primary contact name',
  'contacts[0].mobile_number': 'Primary contact mobile',
  'contacts[0].email': 'Primary contact email',
  lead_status: 'Lead status',
  priority: 'Priority',
  capacity_min: 'Minimum capacity',
  capacity_max: 'Maximum capacity',
  expected_charges: 'Expected charges',
  security_deposit: 'Security deposit',
  host_name: 'Host name',
  organization_name: 'Organization name',
  community_size: 'Community size',
  past_attendees: 'Past attendees',
  instagram_link: 'Instagram link',
  community_link: 'Community link',
  website: 'Website',
  services_offered: 'Services offered',
  super_category_id: 'Super category',
};

/**
 * Flattens a react-hook-form error tree into `{ path, label, message }[]` so we
 * can list each failing field by its human-friendly name in a top-level alert.
 * Paths use dot/bracket notation so they match what FormAccordion's
 * `fieldPaths` prop expects. Both string leaves (used in unit tests) and RHF
 * `{ message }` leaf objects are recognised.
 */
export function flattenErrors(errors: ErrorTree): { path: string; label: string; message: string }[] {
  const out: { path: string; label: string; message: string }[] = [];
  const push = (path: string, message: string) => {
    out.push({ path, label: LABELS[path] ?? humanise(path), message });
  };
  const walk = (value: any, path: string) => {
    if (value == null) return;
    if (typeof value === 'string') {
      push(path, value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, idx) => walk(entry, `${path}[${idx}]`));
      return;
    }
    if (typeof value === 'object') {
      // RHF leaf error: `{ message, type, ref }`. Treat it as a single entry
      // rather than recursing into its internals.
      if (typeof value.message === 'string' && path) {
        push(path, value.message);
        return;
      }
      for (const key of Object.keys(value)) {
        if (key === 'ref' || key === 'type' || key === 'message') continue;
        walk(value[key], path ? `${path}.${key}` : key);
      }
    }
  };
  walk(errors, '');
  return out;
}

function humanise(path: string) {
  return path
    .replace(/\[(\d+)\]/g, ' #$1')
    .replace(/[._]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
