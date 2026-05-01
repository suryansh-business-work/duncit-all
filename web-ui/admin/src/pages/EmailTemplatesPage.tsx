import { useEffect, useMemo, useState } from 'react';
import { gql, useMutation, useQuery, useApolloClient } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Editor from '@monaco-editor/react';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CodeIcon from '@mui/icons-material/Code';

const TEMPLATES = gql`
  query EmailTemplates {
    emailTemplates {
      template_id
      slug
      name
      description
      subject
      mjml
      variables {
        key
        description
        sample
      }
      is_active
      updated_at
    }
  }
`;

const RENDER = gql`
  query RenderTpl($mjml: String!, $vars: String) {
    renderEmailTemplate(mjml: $mjml, vars: $vars) {
      html
      errors
      detected_variables
    }
  }
`;

const CREATE = gql`
  mutation CreateTpl($input: CreateEmailTemplateInput!) {
    createEmailTemplate(input: $input) {
      template_id
    }
  }
`;
const UPDATE = gql`
  mutation UpdateTpl($id: ID!, $input: UpdateEmailTemplateInput!) {
    updateEmailTemplate(template_id: $id, input: $input) {
      template_id
    }
  }
`;
const DELETE = gql`
  mutation DeleteTpl($id: ID!) {
    deleteEmailTemplate(template_id: $id)
  }
`;
const SEND_TEST = gql`
  mutation SendTest($id: ID!, $to: String!, $vars: String) {
    sendTestEmail(template_id: $id, to: $to, vars: $vars) {
      ok
      message
    }
  }
`;

const STARTER = `<mjml>
  <mj-body>
    <mj-section background-color="#ffffff">
      <mj-column>
        <mj-text font-size="20px" font-weight="700">Hello {{ name }}</mj-text>
        <mj-text>Edit this template and click Preview.</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

interface Tpl {
  template_id: string;
  slug: string;
  name: string;
  description?: string;
  subject: string;
  mjml: string;
  variables: { key: string; description?: string; sample?: string }[];
  is_active: boolean;
}

export default function EmailTemplatesPage() {
  const { data, loading, refetch } = useQuery<{ emailTemplates: Tpl[] }>(TEMPLATES, {
    fetchPolicy: 'cache-and-network',
  });
  const [updateTpl] = useMutation(UPDATE);
  const [deleteTpl] = useMutation(DELETE);
  const [createTpl] = useMutation(CREATE);
  const [sendTest] = useMutation(SEND_TEST);
  const client = useApolloClient();

  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Tpl | null>(null);
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [detected, setDetected] = useState<string[]>([]);
  const [varsJson, setVarsJson] = useState('{}');
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState('');

  const list = data?.emailTemplates ?? [];

  // Pick first template once data loads.
  useEffect(() => {
    if (!selected && list.length) setSelected(list[0].template_id);
  }, [list, selected]);

  // Load draft from selected template.
  useEffect(() => {
    const t = list.find((x) => x.template_id === selected);
    if (!t) return;
    setDraft(JSON.parse(JSON.stringify(t)));
    setVarsJson(
      JSON.stringify(
        Object.fromEntries(t.variables.map((v) => [v.key, v.sample ?? `{{${v.key}}}`])),
        null,
        2
      )
    );
  }, [selected, list]);

  const dirty = useMemo(() => {
    const t = list.find((x) => x.template_id === selected);
    return !!draft && !!t && JSON.stringify(t) !== JSON.stringify(draft);
  }, [draft, list, selected]);

  const renderPreview = async () => {
    if (!draft) return;
    try {
      const res = await client.query({
        query: RENDER,
        variables: { mjml: draft.mjml, vars: varsJson },
        fetchPolicy: 'network-only',
      });
      setPreviewHtml(res.data?.renderEmailTemplate?.html ?? '');
      setPreviewErrors(res.data?.renderEmailTemplate?.errors ?? []);
      setDetected(res.data?.renderEmailTemplate?.detected_variables ?? []);
    } catch (e: any) {
      setPreviewErrors([e.message]);
    }
  };

  // Auto-render with light debounce.
  useEffect(() => {
    if (!draft) return;
    const id = setTimeout(renderPreview, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.mjml, varsJson]);

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await updateTpl({
        variables: {
          id: draft.template_id,
          input: {
            name: draft.name,
            description: draft.description,
            subject: draft.subject,
            mjml: draft.mjml,
            variables: draft.variables.map(({ key, description, sample }) => ({
              key,
              description,
              sample,
            })),
            is_active: draft.is_active,
          },
        },
      });
      await refetch();
      setSnack({ kind: 'success', msg: 'Template saved' });
    } catch (e: any) {
      setSnack({ kind: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!draft) return;
    if (!confirm(`Delete template "${draft.name}"?`)) return;
    await deleteTpl({ variables: { id: draft.template_id } });
    setSelected(null);
    await refetch();
    setSnack({ kind: 'success', msg: 'Deleted' });
  };

  const importDetected = () => {
    if (!draft) return;
    const existing = new Map(draft.variables.map((v) => [v.key, v]));
    detected.forEach((k) => {
      if (!existing.has(k)) existing.set(k, { key: k });
    });
    setDraft({ ...draft, variables: [...existing.values()] });
  };

  const validateMjml = async () => {
    await renderPreview();
    setSnack({
      kind: previewErrors.length ? 'error' : 'success',
      msg: previewErrors.length ? `${previewErrors.length} MJML issues` : 'MJML looks good',
    });
  };

  if (loading && !data)
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Email Templates
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Edit MJML on the left, see the rendered preview on the right. Templates are
            looked up by <code>slug</code> from server code.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          New template
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        {/* Left rail: template list */}
        <Box
          sx={{
            width: 280,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            overflowY: 'auto',
          }}
        >
          <List dense disablePadding>
            {list.map((t) => (
              <ListItemButton
                key={t.template_id}
                selected={selected === t.template_id}
                onClick={() => setSelected(t.template_id)}
              >
                <ListItemText
                  primary={t.name}
                  secondary={
                    <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{t.slug}</span>
                  }
                />
                {!t.is_active && <Chip size="small" label="off" />}
              </ListItemButton>
            ))}
          </List>
        </Box>

        {/* Editor + preview */}
        {draft ? (
          <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <TextField
                size="small"
                label="Name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                sx={{ flex: '1 1 200px' }}
              />
              <TextField
                size="small"
                label="Slug"
                value={draft.slug}
                disabled
                sx={{ flex: '1 1 160px' }}
                helperText="Used by code; cannot be edited."
              />
              <TextField
                size="small"
                label="Subject"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                sx={{ flex: '2 1 320px' }}
                helperText="Variables {{ name }} are interpolated."
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0 }}>
              {/* Code editor */}
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
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}
                >
                  <CodeIcon fontSize="small" />
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>
                    MJML source
                  </Typography>
                  <Tooltip title="Validate & render">
                    <IconButton size="small" onClick={validateMjml}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <Editor
                    height="100%"
                    defaultLanguage="html"
                    value={draft.mjml}
                    onChange={(v) => setDraft({ ...draft, mjml: v ?? '' })}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      formatOnPaste: true,
                      tabSize: 2,
                      wordWrap: 'on',
                      automaticLayout: true,
                    }}
                  />
                </Box>
              </Box>

              {/* Preview / variables */}
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
                      <Button size="small" onClick={importDetected} disabled={!detected.length}>
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
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={save}
                disabled={!dirty || busy}
              >
                {busy ? 'Saving…' : 'Save'}
              </Button>
              <Button startIcon={<SendIcon />} onClick={() => setTestOpen(true)}>
                Send test
              </Button>
              <Button color="error" startIcon={<DeleteIcon />} onClick={onDelete}>
                Delete
              </Button>
              <Box sx={{ flex: 1 }} />
              {dirty && (
                <Typography variant="caption" color="warning.main">
                  Unsaved changes
                </Typography>
              )}
            </Stack>
          </Stack>
        ) : (
          <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
            <Typography color="text.secondary">Select a template from the left.</Typography>
          </Box>
        )}
      </Stack>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New email template</DialogTitle>
        <CreateTemplateForm
          onCancel={() => setCreateOpen(false)}
          onCreate={async (input) => {
            try {
              const r = await createTpl({ variables: { input: { ...input, mjml: STARTER } } });
              setCreateOpen(false);
              await refetch();
              setSelected(r.data?.createEmailTemplate?.template_id ?? null);
              setSnack({ kind: 'success', msg: 'Template created' });
            } catch (e: any) {
              setSnack({ kind: 'error', msg: e.message });
            }
          }}
        />
      </Dialog>

      {/* Send test dialog */}
      <Dialog open={testOpen} onClose={() => setTestOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Send test email</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="normal"
            type="email"
            label="To"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
          />
          <Typography variant="caption" color="text.secondary">
            Uses the sample JSON from the Variables tab.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!testTo || !draft}
            onClick={async () => {
              if (!draft) return;
              const res = await sendTest({
                variables: { id: draft.template_id, to: testTo, vars: varsJson },
              });
              const r = res.data?.sendTestEmail;
              setSnack({
                kind: r?.ok ? 'success' : 'error',
                msg: r?.message || (r?.ok ? 'Sent' : 'Failed'),
              });
              if (r?.ok) setTestOpen(false);
            }}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>

      {snack && (
        <Alert
          severity={snack.kind}
          onClose={() => setSnack(null)}
          sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1400 }}
        >
          {snack.msg}
        </Alert>
      )}
    </Box>
  );
}

function CreateTemplateForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (input: { slug: string; name: string; subject: string }) => void;
}) {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  return (
    <>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="normal"
          label="Slug"
          value={slug}
          onChange={(e) =>
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
          }
          helperText="Used by code, e.g. welcome, payment-receipt."
        />
        <TextField
          fullWidth
          margin="normal"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Welcome to {{ app_name }}"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!slug || !name || !subject}
          onClick={() => onCreate({ slug, name, subject })}
        >
          Create
        </Button>
      </DialogActions>
    </>
  );
}
