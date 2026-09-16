import { z } from 'zod';
import { fallbackT, type Translate } from '@duncit/shell';
import type { OfficialStatusRow, StatusLocationOption } from '../queries';

/** Scope radio — Global, or the cities the marketer picks. */
export const scopeOptions = (t: Translate) =>
  [
    { value: 'GLOBAL', label: t('marketing.status.global'), testId: 'status-scope-global' },
    { value: 'LOCATION', label: t('marketing.status.selectedCities'), testId: 'status-scope-location' },
  ] as const;

/** Expiry radio — the three windows the server turns into `expires_at`. */
export const expiryOptions = (t: Translate) =>
  [
    { value: 'HOURS_24', label: t('marketing.status.expiry24Hours'), testId: 'status-expiry-hours-24' },
    { value: 'NEVER', label: t('marketing.status.never'), testId: 'status-expiry-never' },
    { value: 'CUSTOM', label: t('marketing.status.expiryCustom'), testId: 'status-expiry-custom' },
  ] as const;

/**
 * The server's link rule, verbatim: empty, an in-app path, or an https URL.
 * Plain `http://` is refused there, so it is refused here too.
 */
const isUsableLink = (value: string) => {
  if (!value) return true;
  if (value.startsWith('/')) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** The server's media rule: an http(s) URL, so a `data:` blob never gets saved. */
const isUsableMedia = (value: string) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
};

type StatusValues = {
  scope: 'GLOBAL' | 'LOCATION';
  location_ids: string[];
  expiry: 'HOURS_24' | 'NEVER' | 'CUSTOM';
  custom_expires_at: Date | null;
  link_url: string;
  media_url: string;
};

/**
 * The cross-field half of the contract — the same refusals the resolver raises,
 * so a save is never rejected server-side first.
 */
function refineStatus(values: StatusValues, ctx: z.RefinementCtx, t: Translate): void {
  const custom = values.custom_expires_at;
  if (values.scope === 'LOCATION' && values.location_ids.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['location_ids'],
      message: t('marketing.status.pickAtLeastOneCity'),
    });
  }
  if (values.expiry === 'CUSTOM' && !custom) {
    ctx.addIssue({
      code: 'custom',
      path: ['custom_expires_at'],
      message: t('marketing.status.pickAnExpiryDate'),
    });
  }
  if (values.expiry === 'CUSTOM' && custom && custom.getTime() <= Date.now()) {
    ctx.addIssue({
      code: 'custom',
      path: ['custom_expires_at'],
      message: t('marketing.status.expiryMustBeFuture'),
    });
  }
  if (values.media_url && !isUsableMedia(values.media_url)) {
    ctx.addIssue({
      code: 'custom',
      path: ['media_url'],
      message: t('marketing.status.mediaInvalid'),
    });
  }
  if (values.link_url && !isUsableLink(values.link_url)) {
    ctx.addIssue({
      code: 'custom',
      path: ['link_url'],
      message: t('marketing.status.linkInvalid'),
    });
  }
}

/**
 * Official status contract — RHF + Zod, mirroring
 * `officialStatus.validator`'s rules field for field.
 *
 * `custom_expires_at` is a Date rather than a string because the MUIX picker
 * hands back a Date; it is serialised on the way to the server, not in the form.
 */
export const statusSchema = (t: Translate = fallbackT) =>
  z
    .object({
      title: z
        .string()
        .trim()
        .min(2, t('marketing.status.titleTooShort'))
        .max(120, t('marketing.status.titleTooLong')),
      media_url: z
        .string()
        .trim()
        .min(1, t('marketing.status.mediaRequired'))
        .max(600, t('marketing.status.mediaTooLong')),
      media_type: z.enum(['IMAGE', 'VIDEO']),
      caption: z.string().trim().max(300, t('marketing.status.captionTooLong')).default(''),
      link_url: z.string().trim().default(''),
      scope: z.enum(['GLOBAL', 'LOCATION']),
      location_ids: z.array(z.string()).default([]),
      expiry: z.enum(['HOURS_24', 'NEVER', 'CUSTOM']),
      custom_expires_at: z.date().nullable().default(null),
      is_active: z.boolean(),
    })
    .superRefine((values, ctx) => refineStatus(values, ctx, t));

export type StatusFormValues = z.infer<ReturnType<typeof statusSchema>>;

/** A new status is global, live and gone tomorrow — the common case. */
export function blankStatusValues(): StatusFormValues {
  return {
    title: '',
    media_url: '',
    media_type: 'IMAGE',
    caption: '',
    link_url: '',
    scope: 'GLOBAL',
    location_ids: [],
    expiry: 'HOURS_24',
    custom_expires_at: null,
    is_active: true,
  };
}

/**
 * An existing row as form values, for the edit dialog.
 *
 * The server stores the RESULT of the expiry choice (`expires_at`) rather than
 * the choice, so a row that once said "24 hours" reopens as the date it landed
 * on. That is the honest reading: re-saving it as HOURS_24 would silently move
 * the deadline.
 */
export function toStatusValues(row: OfficialStatusRow): StatusFormValues {
  return {
    title: row.title,
    media_url: row.media_url,
    media_type: row.media_type,
    caption: row.caption,
    link_url: row.link_url,
    scope: row.scope,
    location_ids: [...row.location_ids],
    expiry: row.expires_at ? 'CUSTOM' : 'NEVER',
    custom_expires_at: row.expires_at ? new Date(row.expires_at) : null,
    is_active: row.is_active,
  };
}

export function toStatusInput(values: StatusFormValues) {
  const cast = statusSchema().parse(values);
  const customExpiry = cast.expiry === 'CUSTOM' ? cast.custom_expires_at : null;
  return {
    title: cast.title,
    media_url: cast.media_url,
    media_type: cast.media_type,
    caption: cast.caption,
    link_url: cast.link_url,
    scope: cast.scope,
    location_ids: cast.scope === 'LOCATION' ? cast.location_ids : [],
    expiry: cast.expiry,
    custom_expires_at: customExpiry ? customExpiry.toISOString() : null,
    is_active: cast.is_active,
  };
}

export interface StatusFormProps {
  locations: StatusLocationOption[];
  initialValues: StatusFormValues;
  busy: boolean;
  errorMessage?: string | null;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: StatusFormValues) => Promise<void> | void;
}
