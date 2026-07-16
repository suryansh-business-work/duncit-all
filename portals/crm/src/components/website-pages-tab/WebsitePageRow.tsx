import { useMutation } from '@apollo/client';
import { Chip, IconButton, Stack, TableCell, TableRow, Tooltip, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArticleIcon from '@mui/icons-material/Article';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import {
  FETCH_CRM_WEBSITE_PAGE_CONTENT,
  type CrmWebsitePage,
} from '../../api/websitePages.gql';
import { parseApiError } from '@duncit/utils';

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
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
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
        <Stack direction="row" justifyContent="flex-end" alignItems="center">
          <Tooltip title={fetched ? 'Re-fetch content' : 'Fetch content'}>
            <span>
              <IconButton size="small" color="primary" onClick={run} disabled={loading} aria-label="Fetch content">
                {loading ? <CircularProgress size={16} /> : fetchIcon}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="View content">
            <span>
              <IconButton size="small" onClick={() => onView(page)} disabled={!page.content_text} aria-label="View content">
                <ArticleIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Delete page">
            <span>
              <IconButton size="small" color="error" onClick={() => onDelete(page)} aria-label="Delete page">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
}
