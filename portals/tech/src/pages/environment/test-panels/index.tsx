import { Alert, Box, Divider, Drawer, Stack, Typography } from '@mui/material';
import type { EnvEntry } from '../queries';
import EmailTestPanel from './EmailTestPanel';
import ImagekitTestPanel from './ImagekitTestPanel';
import PexelsTestPanel from './PexelsTestPanel';
import CallTestPanel from './CallTestPanel';
import AiTestPanel from './AiTestPanel';
import GoogleMapsTest from './GoogleMapsTest';
import GoogleOAuthTab from './GoogleOAuthTab';

function Panel({ entry }: Readonly<{ entry: EnvEntry }>) {
  switch (entry.category) {
    case 'EMAIL':
      return <EmailTestPanel entry={entry} />;
    case 'IMAGEKIT':
      return <ImagekitTestPanel entry={entry} />;
    case 'PEXELS':
      return <PexelsTestPanel entry={entry} />;
    case 'GOOGLE_MAPS':
      return <GoogleMapsTest entry={entry} />;
    case 'GOOGLE_OAUTH':
      return <GoogleOAuthTab entry={entry} />;
    case 'TWILIO':
      return <CallTestPanel entry={entry} />;
    case 'OPENAI':
    case 'GEMINI':
      return <AiTestPanel entry={entry} />;
    default:
      return null;
  }
}

interface Props {
  entry: EnvEntry | null;
  onClose: () => void;
}

/** Right-side drawer hosting the category-specific interactive test. */
export default function TestDrawer({ entry, onClose }: Readonly<Props>) {
  return (
    <Drawer anchor="right" open={!!entry} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 440 } } }}>
      {entry && (
        <Stack sx={{ height: '100%' }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={800}>Test {entry.name}</Typography>
            <Typography variant="body2" color="text.secondary">{entry.category}</Typography>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              This test is running using config: <strong>{entry.name}</strong>
              {entry.is_default ? ' (default)' : ''}. Keys are read from the saved config — you don't enter them here.
            </Alert>
            <Panel entry={entry} />
          </Box>
        </Stack>
      )}
    </Drawer>
  );
}
