import { LeadOverviewDetails } from './tabs/LeadOverviewDetails';
import type { LeadTabProps } from './tabs/parts/tabTypes';

interface Props extends LeadTabProps {
  /** Opens another tab of the lead page (the score ring opens Quality). */
  onOpenTab: (tab: string) => void;
  /** The lead's template values, for the bottom bar's Email action. */
  onLeadValues: (values: Readonly<Record<string, string>>) => void;
}

/**
 * The lead's Overview tab: the portal's hero, stat tiles, overview cards and
 * Lead tracking card. Note and Follow-up sit in the page's bottom bar now, so
 * they are under the thumb on every tab, not only at the end of this one.
 */
export function LeadOverviewTab(props: Readonly<Props>) {
  return <LeadOverviewDetails {...props} />;
}
