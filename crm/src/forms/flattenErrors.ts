import type { FormikErrors } from 'formik';

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
};

/**
 * Flattens a Formik error tree into `{ path, label, message }[]` so we can
 * list each failing field by its human-friendly name in a top-level alert.
 * Paths use dot/bracket notation so they match what FormAccordion's
 * `fieldPaths` prop expects.
 */
export function flattenErrors(errors: FormikErrors<any>): { path: string; label: string; message: string }[] {
  const out: { path: string; label: string; message: string }[] = [];
  const walk = (value: any, path: string) => {
    if (value == null) return;
    if (typeof value === 'string') {
      out.push({ path, label: LABELS[path] ?? humanise(path), message: value });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, idx) => walk(entry, `${path}[${idx}]`));
      return;
    }
    if (typeof value === 'object') {
      for (const key of Object.keys(value)) {
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
