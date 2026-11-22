import { useRef, useState } from 'react';
import { Alert, Box, Dialog, Divider, Stack, Tooltip, Typography } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { DuncitTabs } from '@duncit/tabs';
import type { EmailTemplate } from '../../../api/emailTemplates.gql';
import { HOST_VARIABLES, VENUE_VARIABLES } from '../../../config/leadVariables';
import VariablesValuesEditor from '../../../components/email/VariablesValuesEditor';
import VariableChips from '../VariableChips';
import { useTranslation } from '@duncit/shell';
import { paneTabs } from './paneTabs';
import { DeclaredVariablesList } from './DeclaredVariablesList';

interface Props {
  draft: EmailTemplate;
  setDraft: (t: EmailTemplate) => void;
  tab: 'preview' | 'code';
  setTab: (v: 'preview' | 'code') => void;
  previewHtml: string;
  previewErrors: string[];
  detected: string[];
  onImportDetected: () => void;
  onAddVariable: (slug: string) => void;
  onRemoveVariable: (slug: string) => void;
}

/** Human-readable warning for placeholders that aren't valid variables for the target. */
function foreignDetectedMessage(
  slugs: string[],
  target: EmailTemplate['target'],
  targetNoun: string,
  t: ReturnType<typeof useTranslation>['t']
): string {
  const vars = { names: slugs.join(', '), target: targetNoun };
  return target === 'STATIC'
    ? t('crm.emailTemplates.foreignInStatic', { count: slugs.length, vars })
    : t('crm.emailTemplates.foreignForTarget', { count: slugs.length, vars });
}

export default function PreviewVariablesPane(p: Readonly<Props>) {
  const { t } = useTranslation();
  const { draft, setDraft, tab, setTab, previewHtml, previewErrors, detected, onImportDetected, onAddVariable, onRemoveVariable } = p;
  const [fullscreen, setFullscreen] = useState(false);
  // Stable per-row keys for the declared-variables editor: variables have no id
  // and their key/description are edited in place, so a content-based key would
  // remount the input and drop focus.
  const varKeys = useRef<number[]>([]);
  const keySeq = useRef(0);
  if (varKeys.current.length !== draft.variables.length) {
    while (varKeys.current.length < draft.variables.length) varKeys.current.push(keySeq.current++);
    varKeys.current.length = draft.variables.length;
  }
  const declaredRows = draft.variables.map((v, index) => ({ v, index, key: varKeys.current[index] }));
  const declared = new Set(draft.variables.map((v) => v.key));
  const toggle = (slug: string) => (declared.has(slug) ? onRemoveVariable(slug) : onAddVariable(slug));

  const sampleValues = Object.fromEntries(draft.variables.map((v) => [v.key, v.sample ?? '']));
  // The values editor hands back `sampleValues` with one field changed, so every
  // declared key is always present in `next`.
  const setSampleValues = (next: Record<string, string>) =>
    setDraft({ ...draft, variables: draft.variables.map((v) => ({ ...v, sample: next[v.key] })) });

  // Available list + "known" slugs follow the template's target.
  const hostVarsForTarget = draft.target === 'HOST' ? HOST_VARIABLES : [];
  const availableForTarget = draft.target === 'VENUE' ? VENUE_VARIABLES : hostVarsForTarget;
  const targetNoun = draft.target === 'VENUE' ? t('crm.common.venue') : t('crm.common.host');
  const knownSlugs = new Set(availableForTarget.map((v) => v.slug));
  // Detected placeholders that aren't available variables for this target.
  const foreignDetected = detected.filter((s) => !knownSlugs.has(s));

  return (
    <Box sx={{ flex: 1, minWidth: 0, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          borderBottom: 1,
          borderColor: 'divider'
        }}>
        <DuncitTabs items={paneTabs(t)} value={tab} onChange={setTab} sx={{ flex: 1, minHeight: 40 }} />
        {tab === 'preview' && (
          <Tooltip title={t('crm.emailTemplates.fullScreenPreview')}>
            <DuncitIconButton size="small" sx={{ mr: 0.5 }} onClick={() => setFullscreen(true)}><FullscreenIcon fontSize="small" /></DuncitIconButton>
          </Tooltip>
        )}
      </Stack>

      {tab === 'preview' ? (
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', bgcolor: 'background.default' }}>
          {previewErrors.length > 0 && <Alert severity="warning" sx={{ borderRadius: 0 }}>{previewErrors.slice(0, 3).join(' · ')}</Alert>}
          <Box component="iframe" title={t('crm.emailTemplates.previewFrame')} srcDoc={previewHtml} sandbox="" sx={{ width: '100%', height: '100%', border: 'none', bgcolor: 'common.white' }} />
          <Dialog open={fullscreen} onClose={() => setFullscreen(false)} fullScreen slotProps={{ paper: { 'aria-label': t('crm.emailTemplates.fullScreenPreview') } }}>
            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                p: 1,
                borderBottom: 1,
                borderColor: 'divider'
              }}>
              <Typography component="h2"
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  flex: 1
                }}>Preview · {draft.name}</Typography>
              <DuncitIconButton onClick={() => setFullscreen(false)} aria-label={t('crm.emailTemplates.closeFullScreen')}><CloseIcon /></DuncitIconButton>
            </Stack>
            <Box component="iframe" title={t('crm.emailTemplates.previewFrameFullscreen')} srcDoc={previewHtml} sandbox="" sx={{ width: '100%', height: '100%', border: 'none', bgcolor: 'common.white' }} />
          </Dialog>
        </Box>
      ) : (
        <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Stack direction="row" sx={{
                alignItems: "center"
              }}>
                <Typography component="h2" variant="subtitle2" sx={{ flex: 1 }}>{t('crm.emailTemplates.detectedInTemplate')}</Typography>
                <DuncitButton size="small" onClick={onImportDetected} disabled={!detected.length}>{t('crm.emailTemplates.syncAll')}</DuncitButton>
              </Stack>
              <VariableChips title="" items={detected.map((slug) => ({ slug }))} declared={declared} onToggle={toggle} knownSlugs={knownSlugs} emptyHint={t('crm.emailTemplates.noPlaceholdersFound')} />
              {foreignDetected.length > 0 && (
                <Alert severity="warning" sx={{ py: 0 }}>
                  {foreignDetectedMessage(foreignDetected, draft.target, targetNoun, t)}
                </Alert>
              )}
            </Stack>
            {draft.target === 'STATIC' ? (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>{t('crm.emailTemplates.staticTemplateNoLeadVariablesDetected')}</Typography>
            ) : (
              <VariableChips
                title={t('crm.emailTemplates.availableFor', { vars: { target: targetNoun } })}
                items={availableForTarget}
                declared={declared}
                onToggle={toggle}
              />
            )}

            <Divider />
            <Typography component="h2" variant="subtitle2">{t('crm.emailTemplates.defaultValues')}</Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>{t('crm.emailTemplates.usedForPreviewAndAsThe')}</Typography>
            <VariablesValuesEditor variables={draft.variables} values={sampleValues} onChange={setSampleValues} emptyHint={t('crm.emailTemplates.addVariablesFirst')} />

            <Typography component="h2" variant="subtitle2">{t('crm.emailTemplates.declaredVariables')}</Typography>
            {draft.variables.length === 0 ? (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>{t('crm.emailTemplates.addFromTheChipsAbove')}</Typography>
            ) : (
              <DeclaredVariablesList declaredRows={declaredRows} draft={draft} setDraft={setDraft} />
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
