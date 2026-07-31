import { z } from 'zod';

/** Somebody who can open this portal, and so can own a list. */
export interface OwnerOption {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
}

/** What an owner is called wherever the list is shown. */
export const ownerLabel = (owner: OwnerOption) => owner.name || owner.email;

/**
 * The display name for a picked owner id. Written as filter/map/join rather
 * than a find with a fallback so it is total: an id that is no longer in the
 * list (the options refetched between picking and saving) yields '' with no
 * separate branch to reason about or leave untested.
 */
export const ownerNameFor = (id: string, options: OwnerOption[]) =>
  options.filter((o) => o.id === id).map(ownerLabel).join('');

/**
 * Step 2 of the create wizard. The owner is stored as the account id — the
 * display name is resolved from the picker's options when saving, so the two
 * can never disagree.
 */
export const audienceListSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the list a name')
    .max(120, 'Keep the name under 120 characters'),
  description: z.string().trim().max(500, 'Keep the description under 500 characters'),
  owner_user_id: z.string().min(1, 'Pick who owns this list'),
});

export type AudienceListFormValues = z.infer<typeof audienceListSchema>;

export const emptyAudienceList = (ownerUserId = ''): AudienceListFormValues => ({
  name: '',
  description: '',
  owner_user_id: ownerUserId,
});
