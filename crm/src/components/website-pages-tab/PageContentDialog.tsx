import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import type { CrmWebsitePage } from '../../api/websitePages.gql';

interface Props {
  page: CrmWebsitePage | null;
  onClose: () => void;
}

/** Read-only viewer for a page's fetched title + extracted text. */
export default function PageContentDialog({ page, onClose }: Props) {
  return (
    <Dialog open={!!page} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography variant="subtitle1" fontWeight={800} noWrap>
          {page?.title || 'Page content'}
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
            <Typography variant="caption" color="text.secondary">
              {page.content_chars.toLocaleString()} characters extracted
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
          <Typography variant="body2" color="text.secondary">
            No content fetched yet.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
