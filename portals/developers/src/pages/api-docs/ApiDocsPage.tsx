import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TryItPanel from './TryItPanel';
import { API_BASE, API_ENDPOINTS, buildCurl } from './apiReference';

const METHOD_COLOR: Record<string, 'success' | 'primary' | 'error'> = {
  GET: 'success',
  POST: 'primary',
  DELETE: 'error',
};

export default function ApiDocsPage() {
  const [apiKey, setApiKey] = useState('');

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" fontWeight={900}>
          API Reference
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Venue APIs, versioned under <Box component="code">{API_BASE}</Box>. Authenticate every
          request with the <Box component="code">x-api-key</Box> header.
        </Typography>
      </Box>

      <TextField
        size="small"
        type="password"
        label="Your API key (used by Try-It, never stored)"
        placeholder="dk_live_…"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        sx={{ maxWidth: 480 }}
      />

      {API_ENDPOINTS.map((endpoint) => (
        <Accordion key={endpoint.id} disableGutters variant="outlined" sx={{ borderRadius: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
              <Chip size="small" color={METHOD_COLOR[endpoint.method]} label={endpoint.method} sx={{ fontWeight: 900 }} />
              <Typography sx={{ fontFamily: 'monospace', fontSize: 13 }} noWrap>
                {endpoint.path}
              </Typography>
              <Typography variant="body2" fontWeight={800} sx={{ display: { xs: 'none', sm: 'block' } }}>
                {endpoint.title}
              </Typography>
              <Chip size="small" variant="outlined" label={endpoint.scope} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                {endpoint.description}
              </Typography>
              <Box
                component="pre"
                sx={{ m: 0, p: 1.5, borderRadius: 2, bgcolor: 'action.hover', fontSize: 12, overflowX: 'auto' }}
              >
                {buildCurl(endpoint, {}, apiKey)}
              </Box>
              <Typography variant="caption" fontWeight={900} color="text.secondary">
                SAMPLE RESPONSE
              </Typography>
              <Box
                component="pre"
                sx={{ m: 0, p: 1.5, borderRadius: 2, bgcolor: 'action.hover', fontSize: 12, overflowX: 'auto' }}
              >
                {endpoint.sampleResponse}
              </Box>
              <Divider />
              <Typography variant="caption" fontWeight={900} color="text.secondary">
                TRY IT
              </Typography>
              <TryItPanel endpoint={endpoint} apiKey={apiKey} />
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
}
