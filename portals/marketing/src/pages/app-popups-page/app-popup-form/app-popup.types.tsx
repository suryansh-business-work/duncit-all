import { z } from 'zod';
import { requiredText } from '@duncit/forms';
import type { AppPopupRow } from '../queries';

/** A saved Target Audience list, offered as a popup audience. */
export interface AudienceListOption {
  id: string;
  name: string;
  member_count: number;
}

export const PLATFORM_OPTIONS = [
  { value: 'BOTH', label: 'Both (iOS + Android)' },
  { value: 'IOS', label: 'iOS only' },
  { value: 'ANDROID', label: 'Android only' },
] as const;

export const AUDIENCE_OPTIONS = [
  { value: 'ALL_USERS', label: 'All users' },
  { value: 'AUDIENCE_LIST', label: 'Saved audience list' },
] as const;

/** A CTA may leave the app, so it is held to the same shape the server accepts. */
const isUsableCtaUrl = (value: string) => {
  if (value.startsWith('/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * App popup contract — RHF + Zod.
 *
 * The dates are Date objects rather than strings because the MUIX pickers hand
 * back Dates; they are serialised on the way to the server, not in the form.
 */
export const appPopupSchema = z
  .object({
    name: requiredText('Name', 3, 120),
    image_url: z.string().trim().min(1, 'Upload the popup image'),
    start_at: z.date({ required_error: 'Pick a start date', invalid_type_error: 'Pick a start date' }),
    end_at: z.date({ required_error: 'Pick an end date', invalid_type_error: 'Pick an end date' }),
    enabled: z.boolean(),
    platform: z.enum(['BOTH', 'IOS', 'ANDROID']),
    close_button_enabled: z.boolean(),
    cta_label: z.string().trim().max(60, 'Keep the button label under 60 characters').default(''),
    cta_url: z.string().trim().default(''),
    audience_type: z.enum(['ALL_USERS', 'AUDIENCE_LIST']),
    audience_list_id: z.string().trim().default(''),
  })
  .superRefine((values, ctx) => {
    if (values.end_at <= values.start_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_at'],
        message: 'End date must be after the start date',
      });
    }
    if (values.audience_type === 'AUDIENCE_LIST' && !values.audience_list_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['audience_list_id'],
        message: 'Pick an audience list',
      });
    }
    // A link with no label would render a nameless button; a label with no link
    // would render a button that does nothing. Both halves or neither.
    if (values.cta_url && !values.cta_label) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cta_label'],
        message: 'Give the button a label',
      });
    }
    if (values.cta_label && !values.cta_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cta_url'],
        message: 'Give the button a link',
      });
    }
    if (values.cta_url && !isUsableCtaUrl(values.cta_url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cta_url'],
        message: 'Use a full https:// link or an in-app path like /earn',
      });
    }
  });

export type AppPopupFormValues = z.infer<typeof appPopupSchema>;

/** A new popup starts live today and runs for a week — the common case, and a
 * window the marketer edits rather than builds from nothing. */
export function blankAppPopupValues(): AppPopupFormValues {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return {
    name: '',
    image_url: '',
    start_at: start,
    end_at: end,
    enabled: true,
    platform: 'BOTH',
    close_button_enabled: true,
    cta_label: '',
    cta_url: '',
    audience_type: 'ALL_USERS',
    audience_list_id: '',
  };
}

/** An existing row as form values, for the edit dialog. */
export function toAppPopupValues(row: AppPopupRow): AppPopupFormValues {
  return {
    name: row.name,
    image_url: row.image_url,
    start_at: new Date(row.start_at),
    end_at: new Date(row.end_at),
    enabled: row.enabled,
    platform: row.platform,
    close_button_enabled: row.close_button_enabled,
    cta_label: row.cta_label,
    cta_url: row.cta_url,
    audience_type: row.audience_type,
    audience_list_id: row.audience_list_id ?? '',
  };
}

export function toAppPopupInput(values: AppPopupFormValues) {
  const cast = appPopupSchema.parse(values);
  return {
    name: cast.name,
    image_url: cast.image_url,
    start_at: cast.start_at.toISOString(),
    end_at: cast.end_at.toISOString(),
    enabled: cast.enabled,
    platform: cast.platform,
    close_button_enabled: cast.close_button_enabled,
    cta_label: cast.cta_label,
    cta_url: cast.cta_url,
    audience_type: cast.audience_type,
    audience_list_id: cast.audience_type === 'AUDIENCE_LIST' ? cast.audience_list_id : null,
  };
}

export interface AppPopupFormProps {
  audienceLists: AudienceListOption[];
  initialValues: AppPopupFormValues;
  busy: boolean;
  errorMessage?: string | null;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: AppPopupFormValues) => Promise<void> | void;
}
