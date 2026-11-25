import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import type { CrmWebsitePage } from '../../api/websitePages.gql';
import { useTranslation } from '@duncit/shell';

interface Props {
  page: CrmWebsitePage | null;
  onClose: () => void;
}

/** Read-only viewer for a page's fetched title + extracted text. */
export default function PageContentDialog({ page, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={!!page} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography component="span" variant="subtitle1" noWrap sx={{
          fontWeight: 800
        }}>
          {page?.title || t('crm.websitePages.pageContent')}
        </Typography>
        {page && (
          <Link href={page.url} target="_blank" rel="noopener noreferrer" variant="caption" sx={{ wordBreak: 'break-all' }}>
            {page.url}
          </Link>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {page?.content_text ? (
          <Stack spacing={1}>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('crm.websitePages.charsExtracted', { vars: { count: page.content_chars.toLocaleString() } })}
            </Typography>
            <Box
              component="pre"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'inherit',
                fontSize: 14,
                m: 0,
                maxHeight: '60vh',
                overflow: 'auto',
              }}
            >
              {page.content_text}
            </Box>
          </Stack>
        ) : (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('crm.websitePages.noContent')}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
