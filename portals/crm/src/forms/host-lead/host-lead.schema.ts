import { fallbackT } from '@duncit/shell';
import { makeHostLeadSchema } from '@duncit/forms/schemas';

/** The host lead rules, shared with the Duncit CRM Android app (@duncit/forms/schemas). */
export const hostLeadSchema = makeHostLeadSchema(fallbackT);
