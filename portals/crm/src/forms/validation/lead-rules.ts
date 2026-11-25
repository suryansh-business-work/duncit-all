import { fallbackT, type Translate } from '@duncit/shell';
import { contactsSchemaFor as sharedContactsSchemaFor } from '@duncit/forms/schemas';

/**
 * The CRM lead rules now live in @duncit/forms/schemas, shared with the Duncit
 * CRM Android app (CLAUDE.md parity rule). Re-exported here under the names
 * every portal form already imports.
 */
export { contactSchema, numeric, phone, serviceOfferedSchema, urlish } from '@duncit/forms/schemas';

/** Contacts rules, bound to the portal's translator (English fallback when none is passed). */
export const contactsSchemaFor = (t: Translate = fallbackT) => sharedContactsSchemaFor(t);

/** The contacts rules with English messages, for schemas built outside React. */
export const contactsSchema = contactsSchemaFor();
