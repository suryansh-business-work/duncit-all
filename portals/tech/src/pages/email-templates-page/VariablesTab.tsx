import { useRef } from 'react';
import { Box, Button, Chip, IconButton, Stack, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from '@duncit/app-settings';
import type { Tpl } from './queries';

interface Props {
  draft: Tpl;
  setDraft: (t: Tpl) => void;
  detected: string[];
  varsJson: string;
  setVarsJson: (v: string) => void;
  onImportDetected: () => void;
}

/**
 * What the template's placeholders are, and what a preview should put in them.
 *
 * The declared rows are keyed by a counter rather than by the variable name:
 * the name is the field being edited, so keying on it would remount the input
 * on every keystroke and drop focus after one character.
 */
export default function VariablesTab({
  draft,
  setDraft,
  detected,
  varsJson,
  setVarsJson,
  onImportDetected,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const rowKeys = useRef<{ keys: string[]; seq: number }>({ keys: [], seq: 0 });
  if (rowKeys.current.keys.length !== draft.variables.length) {
    const keys = rowKeys.current.keys.slice(0, draft.variables.length);
    while (keys.length < draft.variables.length) {
      rowKeys.current.seq += 1;
      keys.push(`var-${rowKeys.current.seq}`);
    }
    rowKeys.current.keys = keys;
  }

  return (
    <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          Detected in template
        </Typography>
        <Button size="small" onClick={onImportDetected} disabled={!detected.length}>
          Sync to declared list
        </Button>
      </Stack>
      <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
        {detected.length === 0 ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            No <code>{'{{ var }}'}</code> placeholders found.
          </Typography>
        ) : (
          detected.map((k) => <Chip key={k} label={k} size="small" variant="outlined" />)
        )}
      </Stack>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Sample values (JSON)
      </Typography>
      <TextField
        multiline
        minRows={5}
        value={varsJson}
        onChange={(e) => setVarsJson(e.target.value)}
        fullWidth
        placeholder='{"name":"Suryansh"}'
        helperText={t('tech.emailTemplates.usedForLivePreviewAndSend')}
        sx={{ fontFamily: 'monospace', '& textarea': { fontFamily: 'monospace' } }}
      />

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
        Declared variables
      </Typography>
      {draft.variables.length === 0 ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Click <b>Sync</b> above to declare detected variables.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {draft.variables.map((v, i) => (
            <Stack key={rowKeys.current.keys[i]} direction="row" spacing={1}>
              <TextField
                size="small"
                value={v.key}
                onChange={(e) => {
                  const copy = [...draft.variables];
                  copy[i] = { ...copy[i], key: e.target.value };
                  setDraft({ ...draft, variables: copy });
                }}
                sx={{ width: 140 }}
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
              <IconButton
                size="small"
                color="error"
                onClick={() =>
                  setDraft({ ...draft, variables: draft.variables.filter((_, j) => j !== i) })
                }
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}
