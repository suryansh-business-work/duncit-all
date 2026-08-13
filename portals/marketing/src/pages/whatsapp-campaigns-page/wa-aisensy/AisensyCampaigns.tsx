import { useEffect, useMemo, useRef, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import type { AisensyCampaign, AisensyTemplate } from '../queries';
import AisensySection from './AisensySection';
import AisensyDetailDialog, { type AisensyFact } from './AisensyDetailDialog';
import { templateFor, useAisensyCatalogue } from './useAisensyCatalogue';
import {
  AISENSY_CAMPAIGN_STATUS_COLORS,
  campaignSearchText,
  paramsLabel,
  statusKey,
} from './helpers';

const EMPTY = '—';

const getRowId = (campaign: AisensyCampaign) => campaign.name;

/** A campaign AiSensy will accept a send for is Live — anything else is shown
 * as-is so the reason a send fails is visible before sending. */
const renderStatus = (campaign: AisensyCampaign) => (
  <StatusChip
    status={statusKey(campaign.status)}
    label={campaign.status}
    colorMap={AISENSY_CAMPAIGN_STATUS_COLORS}
  />
);

const COLUMNS: DuncitColumn<AisensyCampaign>[] = [
  { field: 'name', headerName: 'Campaign', flex: 1, minWidth: 220 },
  { field: 'type', headerName: 'Type', width: 140 },
  { field: 'status', headerName: 'Status', width: 130, cellRenderer: renderStatus },
  { field: 'template_name', headerName: 'Template', flex: 1, minWidth: 200 },
];

const factsFor = (campaign: AisensyCampaign, template: AisensyTemplate | null): AisensyFact[] => [
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
const missingNoteFor = (campaign: AisensyCampaign | null) => {
  if (!campaign?.template_name) {
    return 'This campaign does not name a template, so there is nothing to preview.';
  }
  return `AiSensy did not return the template “${campaign.template_name}”. Check it still exists under Templates.`;
};

/** The API campaigns AiSensy has for this project, read live. */
export default function AisensyCampaigns() {
  const { configured, campaigns, templates, loading, error } = useAisensyCatalogue();
  const [openName, setOpenName] = useState<string | null>(null);

  const fetchRows = useMemo(() => clientTableFetch(campaigns, campaignSearchText), [campaigns]);

  // The table re-reads only when its own query changes, so a fresh AiSensy
  // answer has to ask for the re-read — otherwise it keeps showing the list it
  // first mounted with.
  const refetchRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  const selected = campaigns.find((campaign) => campaign.name === openName) ?? null;
  const template = selected ? templateFor(selected.name, campaigns, templates) : null;

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Campaigns as AiSensy has them right now. A send only works against one whose status is
        Live. Open a row to see the message it sends.
      </Typography>
      <AisensySection
        configured={configured}
        loading={loading}
        error={error}
        count={campaigns.length}
        emptyText="AiSensy returned no campaigns for this project."
      >
        <DuncitTable<AisensyCampaign>
          tableId="marketing-aisensy-campaigns"
          columns={COLUMNS}
          fetchRows={fetchRows}
          getRowId={getRowId}
          onRowClick={(campaign) => setOpenName(campaign.name)}
          searchPlaceholder="Search campaign, status or template"
          emptyText="No campaign matches that search."
          refetchRef={refetchRef}
        />
      </AisensySection>

      <AisensyDetailDialog
        title={selected?.name ?? null}
        status={selected?.status ?? ''}
        statusColors={AISENSY_CAMPAIGN_STATUS_COLORS}
        facts={selected ? factsFor(selected, template) : []}
        template={template}
        missingNote={missingNoteFor(selected)}
        onClose={() => setOpenName(null)}
      />
    </Stack>
  );
}
