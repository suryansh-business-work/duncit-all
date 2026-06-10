import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import GroupsIcon from '@mui/icons-material/Groups';
import DescriptionIcon from '@mui/icons-material/Description';
import { AI_MJML, CREATE, STARTER_MJML, type EmailTemplateTarget } from '../../api/emailTemplates.gql';
import { parseApiError } from '../../utils/parseApiError';
import MjmlAiButton from './MjmlAiButton';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (templateId: string | null) => void;
}

const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const TARGETS: { value: EmailTemplateTarget; label: string; hint: string; icon: JSX.Element }[] = [
  { value: 'VENUE', label: 'Venue lead emails', hint: 'Use venue lead variables (venue name, city, contact…).', icon: <StorefrontIcon color="primary" /> },
  { value: 'HOST', label: 'Host lead emails', hint: 'Use host lead variables (host name, organization, contact…).', icon: <GroupsIcon color="primary" /> },
  { value: 'STATIC', label: 'Static / no variables', hint: 'A fixed template with no lead-specific variables.', icon: <DescriptionIcon color="primary" /> },
];

/** New CRM email template: first pick a target (card choice), then the basics. */
export default function CreateTemplateDialog({ open, onClose, onCreated }: Readonly<Props>) {
  const [target, setTarget] = useState<EmailTemplateTarget | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [subject, setSubject] = useState('');
  const [mjml, setMjml] = useState(STARTER_MJML);
  const [error, setError] = useState<string | null>(null);
  const [createTpl, { loading }] = useMutation(CREATE);

  const reset = () => { setTarget(null); setName(''); setSlug(''); setSubject(''); setMjml(STARTER_MJML); setError(null); };
  const close = () => { reset(); onClose(); };
  const effectiveSlug = slug.trim() || slugify(name);

  const submit = async () => {
    setError(null);
    if (!name.trim() || !effectiveSlug || !subject.trim() || !target) {
      setError('Pick a type and fill name + subject.');
      return;
    }
    try {
      const res = await createTpl({ variables: { input: { slug: effectiveSlug, name: name.trim(), subject: subject.trim(), target, mjml } } });
      onCreated(res.data?.createEmailTemplate?.template_id ?? null);
      reset();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : close} fullWidth maxWidth="sm">
      <DialogTitle>New email template</DialogTitle>
      <DialogContent>
        {!target ? (
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">Who is this template for?</Typography>
            {TARGETS.map((t) => (
              <Card key={t.value} variant="outlined">
                <CardActionArea onClick={() => setTarget(t.value)} sx={{ p: 1.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    {t.icon}
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>{t.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.hint}</Typography>
                    </Box>
                  </Stack>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">Type:</Typography>
              <Typography variant="body2" fontWeight={700}>{TARGETS.find((t) => t.value === target)?.label}</Typography>
              <Button size="small" onClick={() => setTarget(null)}>Change</Button>
            </Stack>
            <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus fullWidth />
            <TextField size="small" label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(name) || 'welcome-email'} helperText="Stable code key. Auto-derived from name if left blank." fullWidth />
            <TextField size="small" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} fullWidth />
            <Stack direction="row" alignItems="center" spacing={1}>
              <MjmlAiButton currentMjml={mjml} onApply={setMjml} label="Seed MJML with AI" />
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={loading || !target || !name.trim() || !subject.trim()}>
          {loading ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
