import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import type { AisensyTemplate, WaCampaignNameOption } from '../queries';
import AisensySection from './AisensySection';
import CampaignRowActions from './CampaignRowActions';
import AisensyDetailDialog, { type AisensyFact } from './AisensyDetailDialog';
import TemplatesWithoutCampaign from './TemplatesWithoutCampaign';
import { CreateCampaignForm } from './create-campaign-form';
import { templateFor, useAisensyCatalogue } from './useAisensyCatalogue';
import { useAisensyDrafts } from './useAisensyDrafts';
import {
  AISENSY_CAMPAIGN_STATUS_COLORS,
  approvedTemplateGroups,
  campaignRows,
  campaignSearchText,
  paramsLabel,
  statusKey,
  type CampaignRow,
} from './helpers';

const EMPTY = '—';

const getRowId = (campaign: CampaignRow) => campaign.name;

/** A campaign AiSensy will accept a send for is Live — anything else is shown
 * as-is so the reason a send fails is visible before sending. */
const renderStatus = (campaign: CampaignRow) =>
  campaign.status ? (
    <StatusChip
      status={statusKey(campaign.status)}
      label={campaign.status}
      colorMap={AISENSY_CAMPAIGN_STATUS_COLORS}
    />
  ) : null;

const factsFor = (campaign: CampaignRow, template: AisensyTemplate | null): AisensyFact[] => [
  { label: 'Type', value: campaign.type || EMPTY },
  { label: 'Template', value: campaign.template_name || EMPTY },
  {
    label: 'Parameters',
    value: template ? paramsLabel(template.param_count) : EMPTY,
    hint: template ? 'A send must fill exactly that many' : undefined,
  },
];

/** Why a campaign has no sample — a named template AiSensy did not return is a
 * different problem from a campaign that names none. */
const missingNoteFor = (campaign: CampaignRow | null) => {
  if (!campaign?.template_name) {
    return 'AiSensy did not say which template this campaign sends, so there is nothing to preview.';
  }
  return `AiSensy did not return the template “${campaign.template_name}”. Check it still exists under Templates.`;
};

interface Props {
  /** The saved names, which carry this tab when AiSensy cannot be read. */
  names: WaCampaignNameOption[];
  /** Starts a real send against this campaign. */
  onSend: (campaign: CampaignRow) => void;
  /** Sends one test message on it, before pointing it at anybody. */
  onTest: (campaign: CampaignRow) => void;
}

type RowActionHandlers = Pick<Props, 'onSend' | 'onTest'>;

const buildColumns = ({
  onSend,
  onTest,
}: Readonly<RowActionHandlers>): DuncitColumn<CampaignRow>[] => [
  { field: 'name', headerName: 'Campaign', flex: 1, minWidth: 220 },
  { field: 'type', headerName: 'Type', width: 150 },
  { field: 'status', headerName: 'Status', width: 120, cellRenderer: renderStatus },
  { field: 'template_name', headerName: 'Template', flex: 1, minWidth: 180 },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 110,
    sortable: false,
    cellRenderer: (campaign) => (
      <CampaignRowActions campaign={campaign} onSend={onSend} onTest={onTest} />
    ),
  },
];

/** The campaigns that can be sent, and where a send begins: you send the
 * campaign you are looking at, not one picked again from a dropdown. */
export default function AisensyCampaigns({ names, onSend, onTest }: Readonly<Props>) {
  const { t } = useTranslation();
  const { configured, campaigns, templates, loading, error, refetch } = useAisensyCatalogue();
  const [openName, setOpenName] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const onChanged = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const drafts = useAisensyDrafts(onChanged);

  // AiSensy's own list wins wherever it answered; the saved names carry the tab
  // when it did not, so a missing Project credential cannot stop a send.
  const live = configured && !error && campaigns.length > 0;
  const rows = useMemo(() => campaignRows(campaigns, names, live), [campaigns, names, live]);
  const groups = useMemo(
    () => approvedTemplateGroups(templates, campaigns),
    [templates, campaigns]
  );

  const columns = useMemo(() => buildColumns({ onSend, onTest }), [onSend, onTest]);

  const fetchRows = useMemo(() => clientTableFetch(rows, campaignSearchText), [rows]);

  // The table re-reads only when its own query changes, so a fresh AiSensy
  // answer has to ask for the re-read — otherwise it keeps showing the list it
  // first mounted with.
  const refetchRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  const selected = rows.find((campaign) => campaign.name === openName) ?? null;
  const template = selected ? templateFor(selected.name, campaigns, templates) : null;

  const table = (
    <DuncitTable<CampaignRow>
      tableId="marketing-aisensy-campaigns"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={(campaign) => setOpenName(campaign.name)}
      searchPlaceholder="Search campaign, status or template"
      emptyText="No campaign matches that search."
      refetchRef={refetchRef}
    />
  );

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="flex-start" spacing={2}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
          Campaigns as AiSensy has them right now. A send only works against one whose status is
          Live. Open a row to see the message it sends, or use Send to point it at people.
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
          {t('marketingWhatsapp.createCampaign')}
        </Button>
      </Stack>

      <TemplatesWithoutCampaign templates={groups.orphans} onCreate={() => setFormOpen(true)} />

      {live ? (
        <AisensySection
          configured={configured}
          loading={loading}
          error={error}
          count={rows.length}
          emptyText="AiSensy returned no campaigns for this project."
        >
          {table}
        </AisensySection>
      ) : (
        <>
          <Alert severity="warning">
            AiSensy's Project API is not answering, so these are the campaign names saved here —
            without their status or template. Add the <strong>Project ID</strong> and{' '}
            <strong>Project API Key</strong> in the Tech portal (Environment Variables → AiSensy) to
            read the real list. Sending still works.
          </Alert>
          {table}
        </>
      )}

      <AisensyDetailDialog
        title={selected?.name ?? null}
        status={selected?.status ?? ''}
        statusColors={AISENSY_CAMPAIGN_STATUS_COLORS}
        facts={selected ? factsFor(selected, template) : []}
        template={template}
        missingNote={missingNoteFor(selected)}
        onClose={() => setOpenName(null)}
      />

      <CreateCampaignForm
        open={formOpen}
        busy={drafts.creatingCampaign}
        orphans={groups.orphans}
        bound={groups.bound}
        onClose={() => setFormOpen(false)}
        onSubmit={drafts.submitCampaign}
      />
    </Stack>
  );
}
