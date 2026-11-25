import { useMemo } from 'react';
import { Text } from 'tamagui';
import { crmDynamicValueText, crmParseDynamicValues } from '@duncit/utils';

import { LEAD_QUERY_FIELD } from '@/features/leads/leadKinds';
import { CrmAppLeadCustomFieldsDocument } from '@/graphql/leadTabs';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { displayDate } from './parts/dates';
import { DetailCard } from './parts/DetailCard';
import { DetailRow } from './parts/DetailRow';
import { TabLoad } from './parts/TabLoad';
import { kindVars, type LeadTabProps } from './parts/tabTypes';

/**
 * The portal's Custom Fields tab: every active admin-defined field for this
 * kind (Settings → Dynamic Fields) with the lead's value, printed read-only.
 */
export function LeadCustomFieldsTab({ kind, id }: Readonly<LeadTabProps>) {
  const { t } = useTranslation();
  const query = useGqlQuery(
    CrmAppLeadCustomFieldsDocument,
    { ...kindVars(kind, id), entity: kind },
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const data = query.data;
  const entry = data?.[LEAD_QUERY_FIELD[kind]];
  const json = entry?.dynamic_values_json;
  const values = useMemo(() => crmParseDynamicValues(json), [json]);
  if (!data || !entry) return <TabLoad query={query} />;
  const fields = data.crmDynamicFields;
  const words = { yes: t('shell.common.yes'), no: t('shell.common.no'), formatDate: displayDate };
  return (
    <DetailCard
      title={t('crm.common.customFields')}
      subtitle={t('crm.common.adminDefinedFieldsFromSettingsDynamic')}
      icon="tune"
      testID="lead-custom-fields-tab"
    >
      {fields.length === 0 ? (
        <Text color="$muted" testID="lead-custom-fields-empty">
          {t('crm.leadDetail.noCustomFields')}
        </Text>
      ) : null}
      {fields.map((field) => (
        <DetailRow
          key={field.id}
          label={field.label}
          value={crmDynamicValueText(field, values[field.name], words)}
          testID={`lead-custom-field-${field.name}`}
        />
      ))}
    </DetailCard>
  );
}
