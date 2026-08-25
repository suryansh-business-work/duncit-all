import { JSX, useState } from 'react';
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
import { CREATE, STARTER_MJML, type EmailTemplateTarget } from '../../api/emailTemplates.gql';
import { parseApiError } from '@duncit/utils';
import MjmlAiButton from './MjmlAiButton';
import { useTranslation } from '@duncit/shell';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (templateId: string | null) => void;
}

const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

type Translate = ReturnType<typeof useTranslation>['t'];

const targets = (t: Translate): { value: EmailTemplateTarget; label: string; hint: string; icon: JSX.Element }[] =>[
  { value: 'VENUE', label: t('crm.emailTemplates.venueLeadEmails'), hint: 'Use venue lead variables (venue name, city, contact…).', icon: <StorefrontIcon color="primary" /> },
  { value: 'HOST', label: t('crm.emailTemplates.hostLeadEmails'), hint: 'Use host lead variables (host name, organization, contact…).', icon: <GroupsIcon color="primary" /> },
  { value: 'ECOMM', label: t('crm.emailTemplates.ecommLeadEmails'), hint: 'Use ecomm lead variables (seller name, brand, contact…).', icon: <StorefrontIcon color="primary" /> },
  { value: 'STATIC', label: t('crm.emailTemplates.staticNoVariables'), hint: 'A fixed template with no lead-specific variables.', icon: <DescriptionIcon color="primary" /> },
];

/** New CRM email template: first pick a target (card choice), then the basics. */
export default function CreateTemplateDialog({ open, onClose, onCreated }: Readonly<Props>) {
  const { t } = useTranslation();
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
      setError(t('crm.emailTemplates.pickATypeAndFillName'));
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
      <DialogTitle>{t('crm.emailTemplates.newEmailTemplate')}</DialogTitle>
      <DialogContent>
        {target ? (
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row" spacing={1} sx={{
              alignItems: "center"
            }}>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>Type:</Typography>
              <Typography variant="body2" sx={{
                fontWeight: 700
              }}>{targets(t).find((t) => t.value === target)?.label}</Typography>
              <Button size="small" onClick={() => setTarget(null)}>{t('crm.emailTemplates.change')}</Button>
            </Stack>
            <TextField size="small" label={t('shell.common.name')} required value={name} onChange={(e) => setName(e.target.value)} autoFocus fullWidth />
            <TextField size="small" label={t('crm.emailTemplates.slug')} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(name) || 'welcome-email'} helperText={t('crm.emailTemplates.stableCodeKeyAutoDerivedFrom')} fullWidth />
            <TextField size="small" label={t('crm.common.subject')} required value={subject} onChange={(e) => setSubject(e.target.value)} fullWidth />
            <Stack direction="row" spacing={1} sx={{
              alignItems: "center"
            }}>
              <MjmlAiButton currentMjml={mjml} onApply={setMjml} label={t('crm.emailTemplates.seedMjmlWithAi')} />
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>{t('crm.emailTemplates.whoIsThisTemplateFor')}</Typography>
            {targets(t).map((t) => (
              <Card key={t.value} variant="outlined">
                <CardActionArea onClick={() => setTarget(t.value)} sx={{ p: 1.5 }}>
                  <Stack direction="row" spacing={1.5} sx={{
                    alignItems: "center"
                  }}>
                    {t.icon}
                    <Box>
                      <Typography variant="subtitle2" sx={{
                        fontWeight: 700
                      }}>{t.label}</Typography>
                      <Typography variant="caption" sx={{
                        color: "text.secondary"
                      }}>{t.hint}</Typography>
                    </Box>
                  </Stack>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={loading}>{t('shell.common.cancel')}</Button>
        <Button variant="contained" onClick={submit} disabled={loading || !target || !name.trim() || !subject.trim()}>
          {loading ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
