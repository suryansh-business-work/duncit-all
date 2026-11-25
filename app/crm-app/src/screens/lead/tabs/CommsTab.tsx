import { LeadActivity } from '../LeadActivity';
import type { LeadTabProps } from './TabsBTypes';

/** The lead's Communications tab (calls and emails) with the props every lead tab takes. */
export function CommsTab({ kind, id }: Readonly<LeadTabProps>) {
  return <LeadActivity kind={kind} id={id} />;
}
