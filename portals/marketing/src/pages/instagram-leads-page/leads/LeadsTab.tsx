import { useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { IG_LEADS_TABLE, type IgLead, type IgLeadSettings } from '../queries';
import { getLeadColumns } from './leadColumns';
import LeadDrawer from './LeadDrawer';

const getRowId = (row: IgLead) => row.id;

interface Props {
  settings: IgLeadSettings | null;
}

/**
 * Every lead the searches saved, best fit first. "Follow-ups due" narrows to
 * the leads whose next message is owed today — the marketer's daily list.
 */
export default function LeadsTab({ settings }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const client = useApolloClient();
  const [due, setDue] = useState(false);
  const [open, setOpen] = useState<IgLead | null>(null);
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useApolloTableFetch<IgLead>(client, IG_LEADS_TABLE, 'igLeadsTable', { extraVariables: { due } }, [due]);
  const columns = useMemo(() => getLeadColumns(t, locale), [t, locale]);

  const changed = (lead: IgLead | null) => {
    setOpen(lead);
    refetchRef.current?.();
  };

  return (
    <Stack spacing={2} data-testid="ig-leads-tab">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <FormControlLabel
          control={<Switch checked={due} onChange={(event) => setDue(event.target.checked)} />}
          label={t('marketing.igLeads.dueOnly')}
        />
        {settings && (
          <Typography variant="body2" color="text.secondary" aria-live="polite">
            {t('marketing.igLeads.sentToday', { vars: { sent: settings.sent_today, limit: settings.daily_send_limit } })}
          </Typography>
        )}
      </Stack>
      <DuncitTable<IgLead>
        ariaLabel={t('marketing.igLeads.tableTitle')}
        tableId="marketing-ig-leads"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={setOpen}
        refetchRef={refetchRef}
        emptyText={t(due ? 'marketing.igLeads.noneDue' : 'marketing.igLeads.noLeads')}
        searchPlaceholder={t('marketing.igLeads.searchLeads')}
        defaultSort={{ field: 'fit_score', dir: 'desc' }}
      />
      <LeadDrawer lead={open} onClose={() => setOpen(null)} onChanged={changed} />
    </Stack>
  );
}
