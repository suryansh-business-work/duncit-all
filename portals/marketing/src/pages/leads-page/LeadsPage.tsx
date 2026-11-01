import { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Box, Stack } from '@mui/material';
import { PageHeader, type PortalTourStep } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { Translate } from '@duncit/shell';
import RunsGuide from '../activity-page/RunsGuide';
import { pinnedLeadFilters } from './leadFilters';
import LeadSummaryCards from './LeadSummaryCards';
import LeadsToolbar from './LeadsToolbar';
import LeadsTable from './LeadsTable';
import LeadDrawer from './drawer/LeadDrawer';
import NewLeadDialog from './new-lead-form/NewLeadDialog';
import ImportCsvDialog from './import-csv/ImportCsvDialog';
import type { MarketingLeadRow } from './queries';

const TOUR_ID = 'marketing.leads';

type Dialog = 'new' | 'import' | null;

const tourSteps = (t: Translate): PortalTourStep[] => [
  { anchor: 'leads-cards', title: t('marketing.leads.tourCardsTitle'), body: t('marketing.leads.tourCardsBody') },
  { anchor: 'leads-table', title: t('marketing.leads.tourTableTitle'), body: t('marketing.leads.tourTableBody') },
  { anchor: 'leads-actions', title: t('marketing.leads.tourActionsTitle'), body: t('marketing.leads.tourActionsBody') },
];

/**
 * Marketing → Leads: the one pipeline every source feeds, worked here and
 * handed to the CRM when sales should take over. The URL can pin the list —
 * `?stage=QUALIFIED`, `?pipeline=VENUE` — which is how the cards land here.
 */
export default function LeadsPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const pins = useMemo(() => pinnedLeadFilters(params), [params]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const tableRefetch = useRef<(() => void) | null>(null);
  const cardsRefetch = useRef<(() => void) | null>(null);

  const reload = useCallback(() => {
    tableRefetch.current?.();
    cardsRefetch.current?.();
  }, []);
  const open = useCallback((lead: MarketingLeadRow) => setOpenId(lead.id), []);
  const close = useCallback(() => setOpenId(null), []);
  const closeDialog = useCallback(() => setDialog(null), []);
  const added = useCallback(
    (id: string) => {
      reload();
      setOpenId(id);
    },
    [reload],
  );

  return (
    <Stack spacing={2} sx={{ p: 2 }} data-testid="leads-page">
      <PageHeader title={t('marketing.leads.title')} subtitle={t('marketing.leads.subtitle')} />
      <RunsGuide
        id={TOUR_ID}
        summary={t('marketing.leads.introSummary')}
        steps={[t('marketing.leads.introStep1'), t('marketing.leads.introStep2'), t('marketing.leads.introStep3')]}
        tour={tourSteps(t)}
      />
      <LeadSummaryCards refetchRef={cardsRefetch} />
      <Box data-tour="leads-table" data-testid="leads-board">
        <LeadsTable
          extraFilters={pins}
          onOpen={open}
          refetchRef={tableRefetch}
          toolbarActions={<LeadsToolbar onNewLead={() => setDialog('new')} onImport={() => setDialog('import')} />}
        />
      </Box>
      <LeadDrawer leadId={openId} onClose={close} onChanged={reload} />
      <NewLeadDialog open={dialog === 'new'} onClose={closeDialog} onCreated={added} />
      <ImportCsvDialog open={dialog === 'import'} onClose={closeDialog} onImported={reload} />
    </Stack>
  );
}
