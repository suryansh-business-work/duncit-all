import { useMutation } from '@apollo/client';
import { Chip, Stack, TableCell, TableRow, Tooltip, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArticleIcon from '@mui/icons-material/Article';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import { DuncitIconButton } from '@duncit/buttons';
import {
  FETCH_CRM_WEBSITE_PAGE_CONTENT,
  type CrmWebsitePage,
} from '../../api/websitePages.gql';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

const STATUS_COLOR: Record<CrmWebsitePage['status'], 'default' | 'success' | 'error'> = {
  DISCOVERED: 'default',
  FETCHED: 'success',
  ERROR: 'error',
};

interface Props {
  page: CrmWebsitePage;
  onView: (page: CrmWebsitePage) => void;
  onDelete: (page: CrmWebsitePage) => void;
  onError: (msg: string) => void;
}

/** One website-page row with its own "Fetch content" action + view/delete. */
export default function WebsitePageRow({ page, onView, onDelete, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const [fetchContent, { loading }] = useMutation(FETCH_CRM_WEBSITE_PAGE_CONTENT);
  const fetched = page.status === 'FETCHED';

  const run = async () => {
    try {
      await fetchContent({ variables: { id: page.id } });
    } catch (err) {
      onError(parseApiError(err));
    }
  };

  const fetchIcon = fetched ? <RefreshIcon fontSize="small" /> : <DownloadIcon fontSize="small" />;

  return (
    <TableRow hover>
      <TableCell sx={{ maxWidth: 320 }}>
        <Typography
          variant="body2"
          component="a"
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: 'primary.main', wordBreak: 'break-all', textDecoration: 'none' }}
        >
          {page.url}
        </Typography>
        {page.title && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: 'block'
            }}>
            {page.title}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Chip size="small" color={STATUS_COLOR[page.status]} label={page.status} />
        {page.error && (
          <Typography variant="caption" color="error" sx={{ display: 'block' }}>
            {page.error}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">{page.content_chars ? page.content_chars.toLocaleString() : '—'}</TableCell>
      <TableCell align="right">
        <Stack
          direction="row"
          sx={{
            justifyContent: "flex-end",
            alignItems: "center"
          }}>
          <Tooltip title={fetched ? 'Re-fetch content' : 'Fetch content'}>
            <span>
              <DuncitIconButton size="small" color="primary" onClick={run} disabled={loading} aria-label={t('crm.components.fetchContent')}>
                {loading ? <CircularProgress size={16} /> : fetchIcon}
              </DuncitIconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('crm.components.viewContent')}>
            <span>
              <DuncitIconButton size="small" onClick={() => onView(page)} disabled={!page.content_text} aria-label={t('crm.components.viewContent')}>
                <ArticleIcon fontSize="small" />
              </DuncitIconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('crm.components.deletePage')}>
            <span>
              <DuncitIconButton size="small" color="error" onClick={() => onDelete(page)} aria-label={t('crm.components.deletePage')}>
                <DeleteIcon fontSize="small" />
              </DuncitIconButton>
            </span>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
}
