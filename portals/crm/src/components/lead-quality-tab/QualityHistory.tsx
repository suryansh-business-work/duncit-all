import { useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import type { QueryCrmLeadQualityHistoryArgs } from '@duncit/gql-types';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { LEAD_QUALITY_HISTORY, type LeadQualityEvent } from '../../api/leadQuality.gql';
import type { CrmLeadEntityType } from '../../api/crm.types';
import { LeadDetailCard } from '../LeadDetailCard';
import QualityHistoryEvent from './QualityHistoryEvent';

/** The newest score changes and evidence decisions shown (the server allows up to 200). */
const HISTORY_LIMIT = 50;

interface Props {
  entity: CrmLeadEntityType;
  leadId: string;
  itemNames: ReadonlyMap<string, string>;
}

/** The lead's score and evidence history, newest first. */
export default function QualityHistory({ entity, leadId, itemNames }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ crmLeadQualityHistory: LeadQualityEvent[] }, QueryCrmLeadQualityHistoryArgs>(
    LEAD_QUALITY_HISTORY,
    { variables: { entity_type: entity, lead_id: leadId, limit: HISTORY_LIMIT }, fetchPolicy: 'cache-and-network' },
  );
  const events = data?.crmLeadQualityHistory ?? [];

  const body = () => {
    if (loading && !data) return <Loader label={t('crm.leadQualityTab.historyTitle')} />;
    if (error && !data) {
      return (
        <Alert
          severity="error"
          action={
            <DuncitButton color="inherit" size="small" onClick={() => fireAndForget(refetch(), logs.portal.crm, 'LeadQualityTab', 'history')}>
              {t('shell.common.retry')}
            </DuncitButton>
          }
        >
          {t('crm.leadQualityTab.historyLoadFailed')} {parseApiError(error)}
        </Alert>
      );
    }
    if (events.length === 0) {
      return (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.leadQualityTab.historyEmpty')}
        </Typography>
      );
    }
    return (
      <Stack component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {events.map((event) => (
          <QualityHistoryEvent key={event.id} event={event} itemNames={itemNames} />
        ))}
      </Stack>
    );
  };

  return (
    <LeadDetailCard title={t('crm.leadQualityTab.historyTitle')} subtitle={t('crm.leadQualityTab.historySubtitle')} icon={<HistoryIcon color="primary" />}>
      {body()}
    </LeadDetailCard>
  );
}
