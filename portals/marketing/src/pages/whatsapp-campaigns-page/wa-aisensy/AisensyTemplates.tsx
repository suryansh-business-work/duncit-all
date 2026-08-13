import { useEffect, useMemo, useRef, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import type { AisensyTemplate } from '../queries';
import AisensySection from './AisensySection';
import AisensyDetailDialog, { type AisensyFact } from './AisensyDetailDialog';
import { useAisensyCatalogue } from './useAisensyCatalogue';
import {
  AISENSY_TEMPLATE_STATUS_COLORS,
  paramsLabel,
  statusKey,
  templateSearchText,
} from './helpers';

const EMPTY = '—';

/** Name plus language: the same template exists once per language. */
const getRowId = (template: AisensyTemplate) => `${template.name}-${template.language}`;

const renderStatus = (template: AisensyTemplate) => (
  <StatusChip
    status={statusKey(template.status)}
    label={template.status}
    colorMap={AISENSY_TEMPLATE_STATUS_COLORS}
  />
);

/** The first line of the body, so a row hints at the message without becoming
 * the message — the full text is one click away in the sample. */
const renderBody = (template: AisensyTemplate) => (
  <Typography variant="body2" color="text.secondary" noWrap>
    {template.body}
  </Typography>
);

const COLUMNS: DuncitColumn<AisensyTemplate>[] = [
  { field: 'name', headerName: 'Template', minWidth: 220, flex: 1 },
  { field: 'category', headerName: 'Category', width: 140 },
  { field: 'language', headerName: 'Language', width: 120 },
  { field: 'status', headerName: 'Status', width: 130, cellRenderer: renderStatus },
  { field: 'param_count', headerName: 'Params', width: 100 },
  {
    field: 'body',
    headerName: 'Message',
    minWidth: 260,
    flex: 2,
    cellRenderer: renderBody,
  },
];

const factsFor = (template: AisensyTemplate): AisensyFact[] => [
  { label: 'Category', value: template.category || EMPTY },
  { label: 'Language', value: template.language || EMPTY },
  {
    label: 'Parameters',
    value: paramsLabel(template.param_count),
    hint: 'A send must fill exactly that many',
  },
  {
    label: 'Buttons',
    value: template.buttons.length > 0 ? template.buttons.join(', ') : 'None',
  },
];

/** The WhatsApp templates AiSensy has for this project, read live. */
export default function AisensyTemplates() {
  const { configured, templates, loading, error } = useAisensyCatalogue();
  const [openId, setOpenId] = useState<string | null>(null);

  const fetchRows = useMemo(() => clientTableFetch(templates, templateSearchText), [templates]);

  // The table re-reads only when its own query changes, so a fresh AiSensy
  // answer has to ask for the re-read — otherwise it keeps showing the list it
  // first mounted with.
  const refetchRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  const selected = templates.find((template) => getRowId(template) === openId) ?? null;

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        The approved message bodies behind your campaigns — including how many {'{{n}}'} variables
        each one expects. Open a row to see it as WhatsApp will show it.
      </Typography>
      <AisensySection
        configured={configured}
        loading={loading}
        error={error}
        count={templates.length}
        emptyText="AiSensy returned no templates for this project."
      >
        <DuncitTable<AisensyTemplate>
          tableId="marketing-aisensy-templates"
          columns={COLUMNS}
          fetchRows={fetchRows}
          getRowId={getRowId}
          onRowClick={(template) => setOpenId(getRowId(template))}
          searchPlaceholder="Search template, status or message text"
          emptyText="No template matches that search."
          refetchRef={refetchRef}
        />
      </AisensySection>

      <AisensyDetailDialog
        title={selected?.name ?? null}
        status={selected?.status ?? ''}
        statusColors={AISENSY_TEMPLATE_STATUS_COLORS}
        facts={selected ? factsFor(selected) : []}
        template={selected}
        onClose={() => setOpenId(null)}
      />
    </Stack>
  );
}
