import { useMemo } from 'react';
import { Alert, AlertTitle, Box, Chip, Dialog, DialogContent, DialogTitle, LinearProgress, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import { useDateFormat } from '@duncit/app-settings';
import type { AiPrompt } from '../../types';
import { useDetailCopy } from '../../i18n/useDetailCopy';
import { usePromptCopy } from '../../i18n/useCopy';
import { usePromptDetail } from './usePromptDetail';
import { useDetailMutations } from './useDetailMutations';
import { OverviewPanel } from './OverviewPanel';
import { QualityPanel } from './QualityPanel';
import { HistoryPanel } from './HistoryPanel';
import { AnalyticsPanel } from './AnalyticsPanel';
import { SharePanel } from './SharePanel';
import { runInBackground } from '../../log';

export type DetailTab = 'overview' | 'quality' | 'history' | 'analytics' | 'share';

/** The detail view's tab lives in the URL beside the library's own, under its own name. */
export const DETAIL_TAB_PARAM = 'promptTab';

export interface PromptDetailDialogProps {
  promptId: string | null;
  onClose: () => void;
  onEdit: (prompt: AiPrompt) => void;
  /** The library behind the dialog should re-read its list. */
  onChanged: () => void;
  /** The AI portal's own origin, for the public and internal links. */
  portalOrigin: string;
}

/**
 * One prompt, in full: the complete text and its size, ChatGPT's quality
 * review, every saved version, who used it and from where, and how to share it.
 * Opened by clicking a library row or by a `?prompt=<key>` link.
 */
export function PromptDetailDialog({ promptId, onClose, onEdit, onChanged, portalOrigin }: Readonly<PromptDetailDialogProps>) {
  const copy = useDetailCopy();
  const libraryCopy = usePromptCopy();
  const { formatDateTime } = useDateFormat();
  const view = usePromptDetail(promptId);
  const writes = useDetailMutations(promptId, view.refetch, onChanged);
  const items = useMemo(
    () => (['overview', 'quality', 'history', 'analytics', 'share'] as const).map((value) => ({ value, label: copy.detail.tabs[value] })),
    [copy],
  );
  const tabs = useTabParam<DetailTab>({ items, fallback: 'overview', param: DETAIL_TAB_PARAM });
  const detail = view.detail;
  const prompt = detail?.prompt;
  const titleId = 'ai-prompt-detail-title';

  return (
    <Dialog open={Boolean(promptId)} onClose={onClose} fullWidth maxWidth="md" aria-labelledby={titleId} scroll="paper">
      <DialogTitle id={titleId} component="div" sx={{ pr: 7 }}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
            {prompt?.name ?? libraryCopy.pageTitle}
          </Typography>
          {prompt && <Chip size="small" variant="outlined" label={libraryCopy.kinds[prompt.kind].chip} />}
          {prompt && <Chip size="small" variant="outlined" label={libraryCopy.roles[prompt.role]} />}
          {detail?.archived_at && <Chip size="small" color="warning" label={copy.tabs.archived} />}
        </Stack>
        {prompt?.key && (
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
            {prompt.key}
          </Typography>
        )}
        <DuncitIconButton aria-label={copy.detail.close} onClick={onClose} sx={{ position: 'absolute', right: (theme) => theme.spacing(1), top: (theme) => theme.spacing(1) }}>
          <CloseIcon />
        </DuncitIconButton>
      </DialogTitle>
      <DialogContent dividers>
        {view.loading && !detail && <LinearProgress aria-label={copy.detail.tabs.overview} />}
        {view.error && (
          <Alert severity="error">
            <AlertTitle>{copy.detail.loadFailed}</AlertTitle>
            {view.error}
          </Alert>
        )}
        {detail && prompt && (
          <Stack spacing={2}>
            {detail.archived_at && (
              <Alert severity="warning">
                {detail.archived_by_name
                  ? copy.detail.archivedNotice(detail.archived_by_name, formatDateTime(detail.archived_at))
                  : copy.detail.archivedNoticeNoName(formatDateTime(detail.archived_at))}
              </Alert>
            )}
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <DuncitTabs {...tabs} idPrefix={DETAIL_TAB_PARAM} searchable={false} />
              </Box>
              {!detail.archived_at && (
                <DuncitButton size="small" variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(prompt)}>
                  {copy.actions.edit}
                </DuncitButton>
              )}
            </Stack>
            <Box {...tabPanelProps(DETAIL_TAB_PARAM, tabs.value)}>
            {tabs.value === 'overview' && <OverviewPanel detail={detail} onCopied={() => view.record({ type: 'COPY_PROMPT' })} />}
            {tabs.value === 'quality' && (
              <QualityPanel quality={view.quality} scoring={view.scoring} error={view.scoreError} onRescore={() => runInBackground(view.rescore(), 'rescore')} />
            )}
            {tabs.value === 'history' && (
              <>
                {writes.historyError && <Alert severity="error">{writes.historyError}</Alert>}
                <HistoryPanel versions={detail.versions} restoring={writes.restoring} onRestore={(v) => runInBackground(writes.restore(v), 'restore')} />
              </>
            )}
            {tabs.value === 'analytics' && <AnalyticsPanel promptId={prompt.id} totalHits={detail.total_hits} lastHitAt={detail.last_hit_at} />}
            {tabs.value === 'share' && (
              <SharePanel
                detail={detail}
                portalOrigin={portalOrigin}
                busy={writes.shareBusy}
                error={writes.shareError}
                onEnable={(regenerate) => runInBackground(writes.enableShare(regenerate), 'enableShare')}
                onDisable={() => runInBackground(writes.disableShare(), 'disableShare')}
                onEvent={view.record}
              />
            )}
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
