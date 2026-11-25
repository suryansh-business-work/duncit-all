import { fallbackT } from '@duncit/shell';
import { makeEcommLeadSchema } from '@duncit/forms/schemas';

/** The ecomm lead rules, shared with the Duncit CRM Android app (@duncit/forms/schemas). */
export const ecommLeadSchema = makeEcommLeadSchema(fallbackT);
