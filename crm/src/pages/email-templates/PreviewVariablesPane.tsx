import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TuneIcon from '@mui/icons-material/Tune';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import type { EmailTemplate } from '../../api/emailTemplates.gql';
import { HOST_VARIABLES, VENUE_VARIABLES } from '../../config/leadVariables';
import VariablesValuesEditor from '../../components/email/VariablesValuesEditor';
import VariableChips from './VariableChips';

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

export default function PreviewVariablesPane(p: Props) {
  const { draft, setDraft, tab, setTab, previewHtml, previewErrors, detected, onImportDetected, onAddVariable, onRemoveVariable } = p;
  const [fullscreen, setFullscreen] = useState(false);
  const declared = new Set(draft.variables.map((v) => v.key));
  const toggle = (slug: string) => (declared.has(slug) ? onRemoveVariable(slug) : onAddVariable(slug));

  const sampleValues = Object.fromEntries(draft.variables.map((v) => [v.key, v.sample ?? '']));
  const setSampleValues = (next: Record<string, string>) =>
    setDraft({ ...draft, variables: draft.variables.map((v) => ({ ...v, sample: next[v.key] ?? '' })) });

  // Available list + "known" slugs follow the template's target.
  const availableForTarget =
    draft.target === 'VENUE' ? VENUE_VARIABLES : draft.target === 'HOST' ? HOST_VARIABLES : [];
  const knownSlugs = new Set(availableForTarget.map((v) => v.slug));
  // Detected placeholders that aren't available variables for this target.
  const foreignDetected = detected.filter((s) => !knownSlugs.has(s));

  return (
    <Box sx={{ flex: 1, minWidth: 0, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ flex: 1, minHeight: 40 }}>
          <Tab icon={<VisibilityIcon fontSize="small" />} iconPosition="start" label="Preview" value="preview" sx={{ minHeight: 40 }} />
          <Tab icon={<TuneIcon fontSize="small" />} iconPosition="start" label="Variables" value="code" sx={{ minHeight: 40 }} />
        </Tabs>
        {tab === 'preview' && (
          <Tooltip title="Full screen preview">
            <IconButton size="small" sx={{ mr: 0.5 }} onClick={() => setFullscreen(true)}><FullscreenIcon fontSize="small" /></IconButton>
          </Tooltip>
        )}
      </Stack>

      {tab === 'preview' ? (
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', bgcolor: '#f5f5f5' }}>
          {previewErrors.length > 0 && <Alert severity="warning" sx={{ borderRadius: 0 }}>{previewErrors.slice(0, 3).join(' · ')}</Alert>}
          <iframe title="preview" srcDoc={previewHtml} sandbox="" style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} />
          <Dialog open={fullscreen} onClose={() => setFullscreen(false)} fullScreen>
            <Stack direction="row" alignItems="center" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>Preview · {draft.name}</Typography>
              <IconButton onClick={() => setFullscreen(false)} aria-label="Close full screen"><CloseIcon /></IconButton>
            </Stack>
            <iframe title="preview-fullscreen" srcDoc={previewHtml} sandbox="" style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} />
          </Dialog>
        </Box>
      ) : (
        <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center">
                <Typography variant="subtitle2" sx={{ flex: 1 }}>Detected in template</Typography>
                <Button size="small" onClick={onImportDetected} disabled={!detected.length}>Sync all</Button>
              </Stack>
              <VariableChips title="" items={detected.map((slug) => ({ slug }))} declared={declared} onToggle={toggle} knownSlugs={knownSlugs} emptyHint="No {{ var }} placeholders found." />
              {foreignDetected.length > 0 && (
                <Alert severity="warning" sx={{ py: 0 }}>
                  {foreignDetected.length} placeholder{foreignDetected.length === 1 ? '' : 's'} ({foreignDetected.join(', ')}) {foreignDetected.length === 1 ? 'is' : 'are'} not {draft.target === 'STATIC' ? 'expected in a static template' : `an available ${draft.target === 'VENUE' ? 'Venue' : 'Host'} variable`} — they won't be filled from the lead.
                </Alert>
              )}
            </Stack>
            {draft.target === 'STATIC' ? (
              <Typography variant="caption" color="text.secondary">Static template — no lead variables. Detected placeholders show red.</Typography>
            ) : (
              <VariableChips
                title={`Available for ${draft.target === 'VENUE' ? 'Venue' : 'Host'}`}
                items={availableForTarget}
                declared={declared}
                onToggle={toggle}
              />
            )}

            <Divider />
            <Typography variant="subtitle2">Default values</Typography>
            <Typography variant="caption" color="text.secondary">Used for preview, and as the fallback when a lead has no value for the variable.</Typography>
            <VariablesValuesEditor variables={draft.variables} values={sampleValues} onChange={setSampleValues} emptyHint="Add variables above to set default values." />

            <Typography variant="subtitle2">Declared variables</Typography>
            {draft.variables.length === 0 ? (
              <Typography variant="caption" color="text.secondary">Add from the chips above.</Typography>
            ) : (
              <Stack spacing={1}>
                {draft.variables.map((v, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      value={v.key}
                      onChange={(e) => {
                        const copy = [...draft.variables];
                        copy[i] = { ...copy[i], key: e.target.value };
                        setDraft({ ...draft, variables: copy });
                      }}
                      sx={{ width: 160 }}
                    />
                    <TextField
                      size="small"
                      placeholder="description"
                      value={v.description ?? ''}
                      onChange={(e) => {
                        const copy = [...draft.variables];
                        copy[i] = { ...copy[i], description: e.target.value };
                        setDraft({ ...draft, variables: copy });
                      }}
                      sx={{ flex: 1 }}
                    />
                    <Tooltip title={`Copy {{ ${v.key} }}`}>
                      <IconButton size="small" onClick={() => navigator.clipboard?.writeText(`{{ ${v.key} }}`)}><ContentCopyIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <IconButton size="small" color="error" onClick={() => setDraft({ ...draft, variables: draft.variables.filter((_, j) => j !== i) })}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
