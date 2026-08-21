import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import type { AisensyTemplate } from '../queries';
import AisensySection from './AisensySection';
import AisensyDetailDialog, { type AisensyFact } from './AisensyDetailDialog';
import TemplateRowActions from './TemplateRowActions';
import { CreateTemplateForm } from './create-template-form';
import { useAisensyCatalogue } from './useAisensyCatalogue';
import { useAisensyDrafts } from './useAisensyDrafts';
import {
  AISENSY_TEMPLATE_STATUS_COLORS,
  paramsLabel,
  statusKey,
  templateRowId,
  templateSearchText,
} from './helpers';

const EMPTY = '—';

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

const BASE_COLUMNS: DuncitColumn<AisensyTemplate>[] = [
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

interface RowActionDeps {
  busy: boolean;
  onDelete: (template: AisensyTemplate) => void;
}

const buildColumns = ({
  busy,
  onDelete,
}: Readonly<RowActionDeps>): DuncitColumn<AisensyTemplate>[] => [
  ...BASE_COLUMNS,
  {
    field: 'actions',
    headerName: 'Actions',
    width: 100,
    sortable: false,
    cellRenderer: (template) => (
      <TemplateRowActions template={template} busy={busy} onDelete={onDelete} />
    ),
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

/** The WhatsApp templates AiSensy has for this project, read live — and where
 * a new one is submitted to Meta. */
export default function AisensyTemplates() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { configured, templates, loading, error, refetch } = useAisensyCatalogue();
  const [openId, setOpenId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const onChanged = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const drafts = useAisensyDrafts(onChanged);

  const fetchRows = useMemo(() => clientTableFetch(templates, templateSearchText), [templates]);

  // The table re-reads only when its own query changes, so a fresh AiSensy
  // answer has to ask for the re-read — otherwise it keeps showing the list it
  // first mounted with.
  const refetchRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  // Spelled out on the dialog rather than implied by a red icon: there is no
  // edit, no undo, and a campaign already pointing at it stops sending.
  const askDelete = useCallback(
    async (template: AisensyTemplate) => {
      const agreed = await confirm({
        title: t('marketingWhatsapp.deleteTemplateTitle'),
        message: t('marketingWhatsapp.deleteTemplateMessage'),
        confirmLabel: t('marketingWhatsapp.deleteTemplate'),
        cancelLabel: t('marketingWhatsapp.cancel'),
        destructive: true,
      });
      if (agreed) await drafts.removeTemplate(template);
    },
    [confirm, t, drafts.removeTemplate]
  );

  const onDelete = useCallback(
    (row: AisensyTemplate) => {
      askDelete(row).catch(() => undefined);
    },
    [askDelete]
  );

  const columns = useMemo(
    () => buildColumns({ busy: drafts.deletingTemplate, onDelete }),
    [drafts.deletingTemplate, onDelete]
  );

  const selected = templates.find((template) => templateRowId(template) === openId) ?? null;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="flex-start" spacing={2}>
        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={800}>
            {t('marketingWhatsapp.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('marketingWhatsapp.subtitle')}
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
          {t('marketingWhatsapp.createTemplate')}
        </Button>
      </Stack>

      <AisensySection
        configured={configured}
        loading={loading}
        error={error}
        count={templates.length}
        emptyText="AiSensy returned no templates for this project."
      >
        <DuncitTable<AisensyTemplate>
          tableId="marketing-aisensy-templates"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={templateRowId}
          onRowClick={(template) => setOpenId(templateRowId(template))}
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

      <CreateTemplateForm
        open={formOpen}
        busy={drafts.creatingTemplate}
        onClose={() => setFormOpen(false)}
        onSubmit={drafts.submitTemplate}
      />
    </Stack>
  );
}
