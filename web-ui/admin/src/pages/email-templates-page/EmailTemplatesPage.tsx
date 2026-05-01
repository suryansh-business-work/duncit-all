import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useApolloClient } from '@apollo/client';
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
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  TEMPLATES,
  RENDER,
  CREATE,
  UPDATE,
  DELETE,
  SEND_TEST,
  STARTER,
  Tpl,
} from './queries';
import CreateTemplateForm from './CreateTemplateForm';
import TemplateEditorPanel from './TemplateEditorPanel';

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

  useEffect(() => {
    if (!selected && list.length) setSelected(list[0].template_id);
  }, [list, selected]);

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

        {draft ? (
          <TemplateEditorPanel
            draft={draft}
            setDraft={setDraft}
            dirty={dirty}
            busy={busy}
            tab={tab}
            setTab={setTab}
            previewHtml={previewHtml}
            previewErrors={previewErrors}
            detected={detected}
            varsJson={varsJson}
            setVarsJson={setVarsJson}
            onValidate={validateMjml}
            onImportDetected={importDetected}
            onSave={save}
            onDelete={onDelete}
            onSendTest={() => setTestOpen(true)}
          />
        ) : (
          <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
            <Typography color="text.secondary">Select a template from the left.</Typography>
          </Box>
        )}
      </Stack>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New email template</DialogTitle>
        <CreateTemplateForm
          onCancel={() => setCreateOpen(false)}
          onCreate={async (input) => {
            try {
              const r = await createTpl({
                variables: { input: { ...input, mjml: STARTER } },
              });
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
