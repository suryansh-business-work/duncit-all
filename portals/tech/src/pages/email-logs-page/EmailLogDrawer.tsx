import { useQuery } from '@apollo/client';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { notify } from '@duncit/dialogs';
import { useTabParam } from '@duncit/ui';
import EmailLogMeta from './EmailLogMeta';
import EmailLogVars from './EmailLogVars';
import { EMAIL_LOG_ONE, type EmailLogDetail } from './queries';

interface Props {
  /** The row to open, or null for a closed drawer. */
  logId: string | null;
  onClose: () => void;
}

type TabKey = 'preview' | 'html' | 'vars';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'preview', label: 'Preview' },
  { key: 'html', label: 'HTML' },
  { key: 'vars', label: 'Variables' },
];

/**
 * The email as it went out.
 *
 * The body is stored on the row rather than re-rendered from the template,
 * because a template is edited and the question being asked is what THIS
 * person received — not what the template says today.
 */
export default function EmailLogDrawer({ logId, onClose }: Readonly<Props>) {
  // Own key — the drawer opens over the Email Logs table, not instead of it.
  const [tab, setTab] = useTabParam<TabKey>({
    values: TABS.map((t) => t.key),
    fallback: 'preview',
    param: 'selectedtab_emaillog',
  });
  const { data, loading } = useQuery<{ emailLog: EmailLogDetail | null }>(EMAIL_LOG_ONE, {
    variables: { id: logId },
    skip: !logId,
    fetchPolicy: 'cache-and-network',
  });

  const row = data?.emailLog ?? null;
  const html = row?.html ?? '';

  const copyHtml = () => {
    globalThis.navigator.clipboard
      .writeText(html)
      .then(() => notify('HTML copied', 'success'))
      .catch((e: Error) => notify(e.message, 'error'));
  };

  return (
    <Drawer
      anchor="right"
      open={Boolean(logId)}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', md: 720 }, maxWidth: '100%' } }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 2, pb: 1 }}>
        <Typography variant="h6" sx={{ flex: 1, minWidth: 0 }} noWrap>
          {row?.subject || 'Email'}
        </Typography>
        <IconButton onClick={onClose} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />

      {loading && !row && (
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      )}

      {row && (
        <Stack sx={{ flex: 1, minHeight: 0 }}>
          <EmailLogMeta row={row} />
          <Divider />
          <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ px: 1, minHeight: 40 }}>
            {TABS.map((t) => (
              <Tab key={t.key} value={t.key} label={t.label} sx={{ minHeight: 40 }} />
            ))}
          </Tabs>
          <Divider />

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {tab === 'preview' && <PreviewPane html={html} />}
            {tab === 'html' && <HtmlPane html={html} onCopy={copyHtml} />}
            {tab === 'vars' && <EmailLogVars json={row.vars} />}
          </Box>
        </Stack>
      )}

      {!loading && !row && logId && (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
          This log entry no longer exists.
        </Typography>
      )}
    </Drawer>
  );
}

/** An email is a document of its own, so it renders in its own frame. */
function PreviewPane({ html }: Readonly<{ html: string }>) {
  if (!html) return <EmptyBody />;
  return (
    <iframe
      title="Email preview"
      srcDoc={html}
      sandbox=""
      style={{ width: '100%', height: '100%', minHeight: 400, border: 'none', background: 'white' }}
    />
  );
}

function HtmlPane({ html, onCopy }: Readonly<{ html: string; onCopy: () => void }>) {
  if (!html) return <EmptyBody />;
  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
        <Button size="small" startIcon={<ContentCopyIcon />} onClick={onCopy}>
          Copy
        </Button>
      </Stack>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          borderRadius: 1,
          bgcolor: 'action.hover',
          fontSize: 12,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {html}
      </Box>
    </Box>
  );
}

/**
 * No body is the normal case for a row that never got that far — a disabled
 * template, a missing address — so it says which, rather than looking broken.
 */
function EmptyBody() {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
      Nothing was rendered for this attempt — it stopped before a body existed.
    </Typography>
  );
}
