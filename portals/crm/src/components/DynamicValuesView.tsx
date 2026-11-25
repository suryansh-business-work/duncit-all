import type { CrmLeadEntityType } from '../api/crm.types';
import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { CRM_DYNAMIC_FIELDS } from '../api/crm.gql';
import type { CrmDynamicField } from '../api/crm.types';
import { LeadDetailRow } from './LeadDetailCard';
import { formatDate as adminDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { crmDynamicValueText, crmParseDynamicValues } from '@duncit/utils';

interface Props {
  entity: CrmLeadEntityType;
  /** JSON-stringified value map from the lead. */
  json: string;
}

/**
 * Read-only renderer for an entity's dynamic-field values. Fetches the
 * applicable field definitions, then prints each as a labelled row. Empty
 * state (no fields configured) is handled by the caller's tab.
 */
export default function DynamicValuesView({ entity, json }: Readonly<Props>) {
  const { data, loading } = useQuery<{ crmDynamicFields: CrmDynamicField[] }>(CRM_DYNAMIC_FIELDS, {
    variables: { entity, include_inactive: false },
    fetchPolicy: 'cache-first',
  });

  const { t } = useTranslation();
  const values = useMemo(() => crmParseDynamicValues(json), [json]);
  const words = { yes: t('shell.common.yes'), no: t('shell.common.no'), formatDate: (iso: string) => adminDate(iso) || '' };

  const fields = data?.crmDynamicFields ?? [];

  if (loading && fields.length === 0) return null;
  if (fields.length === 0) {
    return (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>{t('crm.leadDetail.noCustomFields')}</Typography>
    );
  }

  return (
    <Box>
      <Stack spacing={0.25}>
        {fields.map((f) => (
          <LeadDetailRow key={f.id} label={f.label} value={crmDynamicValueText(f, values[f.name], words)} />
        ))}
      </Stack>
    </Box>
  );
}
