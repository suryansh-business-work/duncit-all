import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CodeIcon from '@mui/icons-material/Code';
import type { Tpl } from './queries';

interface Props {
  draft: Tpl;
  setDraft: (t: Tpl) => void;
  tab: 'preview' | 'code';
  setTab: (v: 'preview' | 'code') => void;
  previewHtml: string;
  previewErrors: string[];
  detected: string[];
  varsJson: string;
  setVarsJson: (v: string) => void;
  onImportDetected: () => void;
}

export default function PreviewVariablesPane({
  draft,
  setDraft,
  tab,
  setTab,
  previewHtml,
  previewErrors,
  detected,
  varsJson,
  setVarsJson,
  onImportDetected,
}: Readonly<Props>) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40 }}
      >
        <Tab
          icon={<VisibilityIcon fontSize="small" />}
          iconPosition="start"
          label="Preview"
          value="preview"
          sx={{ minHeight: 40 }}
        />
        <Tab
          icon={<CodeIcon fontSize="small" />}
          iconPosition="start"
          label="Variables"
          value="code"
          sx={{ minHeight: 40 }}
        />
      </Tabs>
      {tab === 'preview' ? (
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', bgcolor: '#f5f5f5' }}>
          {previewErrors.length > 0 && (
            <Alert severity="warning" sx={{ borderRadius: 0 }}>
              {previewErrors.slice(0, 3).join(' · ')}
            </Alert>
          )}
          <iframe
            title="preview"
            srcDoc={previewHtml}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'white',
            }}
          />
        </Box>
      ) : (
        <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ flex: 1 }}>
              Detected in template
            </Typography>
            <Button size="small" onClick={onImportDetected} disabled={!detected.length}>
              Sync to declared list
            </Button>
          </Stack>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {detected.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                No <code>{'{{ var }}'}</code> placeholders found.
              </Typography>
            ) : (
              detected.map((k) => (
                <Chip key={k} label={k} size="small" variant="outlined" />
              ))
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
            helperText="Used for live preview and Send test email."
            sx={{ fontFamily: 'monospace', '& textarea': { fontFamily: 'monospace' } }}
          />

          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
            Declared variables
          </Typography>
          {draft.variables.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              Click <b>Sync</b> above to declare detected variables.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {draft.variables.map((v, i) => (
                <Stack key={i} direction="row" spacing={1}>
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
                      setDraft({
                        ...draft,
                        variables: draft.variables.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}
