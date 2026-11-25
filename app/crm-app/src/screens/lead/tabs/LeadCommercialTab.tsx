import { CRM_DASH, crmJoinList } from '@duncit/utils';

import { CrmAppLeadCommercialDocument } from '@/graphql/leadTabs';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { DetailCard } from './parts/DetailCard';
import { DetailRow } from './parts/DetailRow';
import { TabLoad } from './parts/TabLoad';
import type { LeadTabProps } from './parts/tabTypes';

/** The portal's Commercial tab (venue leads): pricing models, charges, deposit, GST and invoice. */
export function LeadCommercialTab({ id }: Readonly<LeadTabProps>) {
  const { t } = useTranslation();
  const query = useGqlQuery(
    CrmAppLeadCommercialDocument,
    { id },
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const venue = query.data?.venueLead;
  if (!venue) return <TabLoad query={query} />;
  const rupees = (amount: number | null | undefined) =>
    amount ? t('crm.leadDetail.amountSpaced', { vars: { amount } }) : CRM_DASH;
  return (
    <DetailCard
      title={t('crm.venueLeads.commercial')}
      icon="currency-rupee"
      testID="lead-commercial-tab"
    >
      <DetailRow
        label={t('crm.venueLeads.pricingModels')}
        value={crmJoinList(venue.pricing_models)}
      />
      <DetailRow
        label={t('crm.venueLeads.expectedCharges')}
        value={rupees(venue.expected_charges)}
      />
      <DetailRow
        label={t('crm.venueLeads.securityDeposit')}
        value={rupees(venue.security_deposit)}
      />
      <DetailRow
        label={t('crm.leadDetail.gst')}
        value={venue.gst_applicable ? t('crm.leadDetail.applicable') : t('shell.common.no')}
      />
      <DetailRow
        label={t('crm.venueLeads.invoice')}
        value={venue.invoice_available ? t('crm.leadDetail.available') : t('shell.common.no')}
      />
    </DetailCard>
  );
}
