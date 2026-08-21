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
import { useTranslation } from '@duncit/shell';
import TryItPanel from './TryItPanel';
import { API_BASE, API_ENDPOINTS, API_KEY_HEADER, buildCurl } from './apiReference';

const METHOD_COLOR: Record<string, 'success' | 'primary' | 'error'> = {
  GET: 'success',
  POST: 'primary',
  DELETE: 'error',
};

export default function ApiDocsPage() {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" fontWeight={900}>
          {t('developers.apiDocs.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {/* The host and header name are substituted rather than written into
              the sentence, so a translation cannot fork the values an
              integrator is meant to copy. */}
          {t('developers.apiDocs.subtitle', {
            vars: { base: API_BASE, header: API_KEY_HEADER },
          })}
        </Typography>
      </Box>

      <TextField
        size="small"
        type="password"
        label={t('developers.apiDocs.keyLabel')}
        placeholder={t('developers.apiDocs.keyPlaceholder')}
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
                {t(endpoint.titleKey)}
              </Typography>
              <Chip size="small" variant="outlined" label={endpoint.scope} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                {t(endpoint.descriptionKey)}
              </Typography>
              <Box
                component="pre"
                sx={{ m: 0, p: 1.5, borderRadius: 2, bgcolor: 'action.hover', fontSize: 12, overflowX: 'auto' }}
              >
                {buildCurl(endpoint, {}, apiKey)}
              </Box>
              <Typography variant="caption" fontWeight={900} color="text.secondary">
                {t('developers.apiDocs.sampleResponse')}
              </Typography>
              <Box
                component="pre"
                sx={{ m: 0, p: 1.5, borderRadius: 2, bgcolor: 'action.hover', fontSize: 12, overflowX: 'auto' }}
              >
                {endpoint.sampleResponse}
              </Box>
              <Divider />
              <Typography variant="caption" fontWeight={900} color="text.secondary">
                {t('developers.apiDocs.tryIt')}
              </Typography>
              <TryItPanel endpoint={endpoint} apiKey={apiKey} />
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
}
