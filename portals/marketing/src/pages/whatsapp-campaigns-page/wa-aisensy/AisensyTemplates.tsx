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
  <Typography variant="body2" noWrap sx={{
    color: "text.secondary"
  }}>
    {template.body}
  </Typography>
);

type Translate = ReturnType<typeof useTranslation>['t'];

const baseColumns = (t: Translate): DuncitColumn<AisensyTemplate>[] => [
  { field: 'name', headerName: t('marketing.whatsappCampaigns.template'), minWidth: 220, flex: 1 },
  { field: 'category', headerName: t('marketing.whatsappCampaigns.category'), width: 140 },
  { field: 'language', headerName: t('marketing.common.language'), width: 120 },
  { field: 'status', headerName: t('shell.common.status'), width: 130, cellRenderer: renderStatus },
  { field: 'param_count', headerName: t('marketing.whatsappCampaigns.params'), width: 100 },
  {
    field: 'body',
    headerName: t('marketing.whatsappCampaigns.message'),
    minWidth: 260,
    flex: 2,
    cellRenderer: renderBody,
  },
];

interface RowActionDeps {
  busy: boolean;
  onDelete: (template: AisensyTemplate) => void;
}

const buildColumns = (
  { busy, onDelete }: Readonly<RowActionDeps>,
  t: Translate,
): DuncitColumn<AisensyTemplate>[] => [
  ...baseColumns(t),
  {
    field: 'actions',
    headerName: t('shell.common.actions'),
    width: 100,
    sortable: false,
    cellRenderer: (template) => (
      <TemplateRowActions template={template} busy={busy} onDelete={onDelete} />
    ),
  },
];

const factsFor = (template: AisensyTemplate, t: Translate): AisensyFact[] => [
  { label: t('marketing.whatsappCampaigns.category'), value: template.category || EMPTY },
  { label: t('marketing.common.language'), value: template.language || EMPTY },
  {
    label: t('marketing.whatsappCampaigns.parameters'),
    value: paramsLabel(template.param_count),
    hint: 'A send must fill exactly that many',
  },
  {
    label: t('marketing.whatsappCampaigns.buttons'),
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
    () => buildColumns({ busy: drafts.deletingTemplate, onDelete }, t),
    [t, drafts.deletingTemplate, onDelete]
  );

  const selected = templates.find((template) => templateRowId(template) === openId) ?? null;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={2} sx={{
        alignItems: "flex-start"
      }}>
        <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{
            fontWeight: 800
          }}>
            {t('marketingWhatsapp.title')}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
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
        emptyText={t('marketing.whatsappCampaigns.aisensyReturnedNoTemplatesForThis')}
      >
        <DuncitTable<AisensyTemplate>
          tableId="marketing-aisensy-templates"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={templateRowId}
          onRowClick={(template) => setOpenId(templateRowId(template))}
          searchPlaceholder="Search template, status or message text"
          emptyText={t('marketing.whatsappCampaigns.noTemplateMatchesThatSearch')}
          refetchRef={refetchRef}
        />
      </AisensySection>

      <AisensyDetailDialog
        title={selected?.name ?? null}
        status={selected?.status ?? ''}
        statusColors={AISENSY_TEMPLATE_STATUS_COLORS}
        facts={selected ? factsFor(selected, t) : []}
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
