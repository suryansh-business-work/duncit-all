import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTableApiAccess, type TableApiAccess } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { copyToClipboard } from '@duncit/utils';
import { useTranslation, type Translate } from '../i18n';
import type { TableQueryState } from '../types';
import type { TableApiSource } from './source';
import { tableApiUrl } from './tableApiUrl';

const TITLE_ID = 'duncit-table-api-title';

interface TableApiDialogProps {
  open: boolean;
  onClose: () => void;
  source: TableApiSource;
  /** The query the grid last fetched, so the URL returns what is on screen. */
  query: TableQueryState;
}

/** Whether the URL below is usable as-is, needs a token first, or could not be built. */
function AccessStatus({ access, t }: Readonly<{ access: TableApiAccess; t: Translate }>) {
  if (access.error) return <Alert severity="error">{t('shell.table.apiLoadFailed')}</Alert>;
  if (!access.token) return <Alert severity="info">{t('shell.table.apiNoToken')}</Alert>;
  return <Alert severity="warning">{t('shell.table.apiTokenWarning')}</Alert>;
}

/** The GET URL for the rows on screen, with paging, the caller's token and a copy button. */
export function TableApiDialog({ open, onClose, source, query }: Readonly<TableApiDialogProps>) {
  const { t } = useTranslation();
  const access = useTableApiAccess(open);
  const token = access.token ?? t('shell.table.apiTokenPlaceholder');
  const url = access.baseUrl
    ? tableApiUrl(access.baseUrl, source.resultKey, source.variablesOf(query), token)
    : '';

  const copy = async () => {
    const copied = await copyToClipboard(url);
    if (copied) {
      notify(t('shell.table.apiCopied'), 'success');
    } else {
      notify(t('shell.table.apiCopyFailed'), 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby={TITLE_ID}>
      <DialogTitle id={TITLE_ID}>{t('shell.table.getApi')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2">{t('shell.table.apiIntro')}</Typography>
          {access.loading && !url ? <CircularProgress size={24} /> : <AccessStatus access={access} t={t} />}
          {url ? (
            <Typography
              component="code"
              variant="body2"
              data-testid="table-api-url"
              sx={{ fontFamily: 'monospace', wordBreak: 'break-all', p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}
            >
              {`GET ${url}`}
            </Typography>
          ) : null}
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('shell.table.apiPagination')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('shell.table.apiHeaderHint')}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
        <DuncitButton variant="contained" startIcon={<ContentCopyIcon />} disabled={!url} onClick={copy}>
          {t('shell.table.apiCopy')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
