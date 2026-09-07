import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, clientTableFetch } from '@duncit/table';
import { useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import type { AisensyTemplate } from '../queries';
import AisensySection from './AisensySection';
import AisensyDetailDialog, { type AisensyFact } from './AisensyDetailDialog';
import { CreateTemplateForm } from './create-template-form';
import { getTemplateColumns, type TemplateSendRow } from './templateColumns';
import { useWaSendCounts, withSendCounts } from './useWaSendCounts';
import { useAisensyCatalogue } from './useAisensyCatalogue';
import { useAisensyDrafts } from './useAisensyDrafts';
import {
  AISENSY_TEMPLATE_STATUS_COLORS,
  campaignsSending,
  paramsLabel,
  templateRowId,
  templateSearchText,
} from './helpers';

const EMPTY = '—';

type Translate = ReturnType<typeof useTranslation>['t'];

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

interface Props {
  /** Opens the Logs tab narrowed to a set of campaigns — what the Sent count does. */
  onOpenLogs: (campaigns: readonly string[]) => void;
}

/** The WhatsApp templates AiSensy has for this project, read live — and where
 * a new one is submitted to Meta. */
export default function AisensyTemplates({ onOpenLogs }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { configured, campaigns, templates, loading, error, refetch } = useAisensyCatalogue();
  const counts = useWaSendCounts();
  const [openId, setOpenId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const onChanged = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const drafts = useAisensyDrafts(onChanged);

  const rows = useMemo(
    () =>
      withSendCounts(templates, counts, (template) => campaignsSending(template.name, campaigns)),
    [templates, counts, campaigns]
  );

  const fetchRows = useMemo(() => clientTableFetch(rows, templateSearchText), [rows]);

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
    () => getTemplateColumns({ t, busy: drafts.deletingTemplate, onDelete, onOpenLogs }),
    [t, drafts.deletingTemplate, onDelete, onOpenLogs]
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
        <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
          {t('marketingWhatsapp.createTemplate')}
        </DuncitButton>
      </Stack>

      <AisensySection
        configured={configured}
        loading={loading}
        error={error}
        count={templates.length}
        emptyText={t('marketing.whatsappCampaigns.aisensyReturnedNoTemplatesForThis')}
      >
        <DuncitTable<TemplateSendRow>
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
