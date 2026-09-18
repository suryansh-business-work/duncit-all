import { useCallback, useRef } from 'react';
import { useQuery } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { useLogCampaignParam, useWaCampaignActions, WaLogs, type WaAudienceList } from '../../log-pages';
import { LOGS_WA_AUDIENCE_LISTS } from './queries';

/**
 * Communications' WhatsApp log, as a page of its own.
 *
 * There it is a tab of the WhatsApp console and borrows that console's heading;
 * here it is the whole page, so it carries its own. Everything else is the same
 * log — the table, the detail a row opens, the `?wacampaign=` narrowing — less
 * Duplicate, which starts a new send and so stays where sends are made.
 */
export default function WhatsappLogsPage() {
  const { t } = useTranslation();
  const refetchRef = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => refetchRef.current?.(), []);
  const actions = useWaCampaignActions(refresh);
  const logFilter = useLogCampaignParam();
  const { data } = useQuery<{ audienceLists: WaAudienceList[] }>(LOGS_WA_AUDIENCE_LISTS, {
    fetchPolicy: 'cache-first',
  });

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
        {t('shell.nav.whatsappLogs')}
      </Typography>
      <WaLogs
        audienceLists={data?.audienceLists ?? []}
        actions={actions}
        refetchRef={refetchRef}
        campaigns={logFilter.campaigns}
        onClearCampaigns={logFilter.clear}
      />
    </Stack>
  );
}
