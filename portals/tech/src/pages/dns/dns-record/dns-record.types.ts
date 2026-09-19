import { z } from 'zod';
import type { DnsRecord, DnsRecordInput, DnsZone } from '@duncit/gql-types';

/**
 * The record editor's shape and its validation.
 *
 * The TTL bounds and the domain come from `dnsZone`, so nothing GoDaddy
 * decides is written down here. The server checks all of it again — this only
 * saves a round trip for the mistakes worth catching before one.
 */

/** The zone rules the schema is built from. */
export type DnsRecordRules = Pick<DnsZone, 'domain' | 'min_ttl' | 'max_ttl'>;

/** The validation copy, passed in translated — the schema renders no English. */
export interface DnsRecordMessages {
  nameInvalid: string;
  nameIsRelative: string;
  valueRequired: string;
  ipv4: string;
  ipv6: string;
  ttlRange: string;
  priorityRange: string;
}

/** `@`, `*`, or dot-separated labels (letters, digits, `-`, `_`), optionally under a `*.` wildcard. */
const NAME_RE = /^(?:@|\*|(?:\*\.)?[\w-]+(?:\.[\w-]+)*)$/;

/** Priority is a 16-bit field in DNS itself. */
const MAX_PRIORITY = 65_535;

/** A new record's priority, shown only once MX is picked. 10 is the conventional first MX. */
const DEFAULT_PRIORITY = 10;

export const dnsRecordSchema = (rules: DnsRecordRules, messages: DnsRecordMessages) =>
  z
    .object({
      type: z.string().min(1),
      name: z
        .string()
        .trim()
        .toLowerCase()
        .regex(NAME_RE, messages.nameInvalid)
        .refine((name) => name !== rules.domain && !name.endsWith(`.${rules.domain}`), messages.nameIsRelative),
      data: z.string().trim().min(1, messages.valueRequired),
      ttl: z.coerce
        .number()
        .int(messages.ttlRange)
        .min(rules.min_ttl, messages.ttlRange)
        .max(rules.max_ttl, messages.ttlRange),
      priority: z.coerce
        .number()
        .int(messages.priorityRange)
        .min(0, messages.priorityRange)
        .max(MAX_PRIORITY, messages.priorityRange),
    })
    .superRefine((values, ctx) => {
      if (values.type === 'A' && !z.ipv4().safeParse(values.data).success) {
        ctx.addIssue({ code: 'custom', path: ['data'], message: messages.ipv4 });
      }
      if (values.type === 'AAAA' && !z.ipv6().safeParse(values.data).success) {
        ctx.addIssue({ code: 'custom', path: ['data'], message: messages.ipv6 });
      }
    });

export type DnsRecordForm = z.infer<ReturnType<typeof dnsRecordSchema>>;

/** A new record: the first type the server writes, at the shortest TTL GoDaddy allows. */
export const blankRecord = (rules: Readonly<Pick<DnsZone, 'writable_types' | 'min_ttl'>>): DnsRecordForm => ({
  type: rules.writable_types[0] ?? '',
  name: '',
  data: '',
  ttl: rules.min_ttl,
  priority: DEFAULT_PRIORITY,
});

/** A listed record, as the form edits it. */
export const toForm = (record: Readonly<DnsRecord>): DnsRecordForm => ({
  type: record.type,
  name: record.name,
  data: record.data,
  ttl: record.ttl,
  priority: record.priority ?? DEFAULT_PRIORITY,
});

/** The form, as the mutation's `DnsRecordInput`. Priority only travels with MX. */
export const toInput = (values: Readonly<DnsRecordForm>): DnsRecordInput => ({
  type: values.type,
  name: values.name,
  data: values.data,
  ttl: values.ttl,
  priority: values.type === 'MX' ? values.priority : null,
});
