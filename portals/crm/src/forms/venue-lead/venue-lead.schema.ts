import { fallbackT } from '@duncit/shell';
import { makeVenueLeadSchema } from '@duncit/forms/schemas';

/** The venue lead rules, shared with the Duncit CRM Android app (@duncit/forms/schemas). */
export const venueLeadSchema = makeVenueLeadSchema(fallbackT);
