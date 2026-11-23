import { Accordion, AccordionDetails, AccordionSummary, Box, Grid, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { IntelApproval } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';

/** The exact request and its before/after preview, collapsed by default. */

const pretty = (json: string): string => {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
};

interface Preview {
  matched?: number;
  before?: unknown[];
  after?: unknown[];
  arguments?: unknown;
}

const parsePreview = (json: string): Preview => {
  try {
    return JSON.parse(json) as Preview;
  } catch {
    return {};
  }
};

const Code = ({ value }: Readonly<{ value: string }>) => (
  <Box component="pre" sx={{ m: 0, p: 1, bgcolor: 'action.hover', borderRadius: 1, fontSize: '0.75rem', overflow: 'auto', maxHeight: 280 }}>
    {value}
  </Box>
);

export default function ApprovalPreview({ approval }: Readonly<{ approval: IntelApproval }>) {
  const { t } = useTranslation();
  const preview = parsePreview(approval.preview);
  const hasDiff = Array.isArray(preview.before) || Array.isArray(preview.after);
  return (
    <Accordion disableGutters variant="outlined" sx={{ borderRadius: 1.5, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {t('intel.approval.details')}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="caption" color="text.secondary">
          {t('intel.approval.request')}
        </Typography>
        <Code value={pretty(approval.request)} />
        {hasDiff && (
          <Grid container spacing={1} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="text.secondary">
                {t('intel.approval.before', { vars: { count: preview.matched ?? preview.before?.length ?? 0 } })}
              </Typography>
              <Code value={JSON.stringify(preview.before ?? [], null, 2)} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="text.secondary">
                {t('intel.approval.after')}
              </Typography>
              <Code value={preview.after?.some((a) => a !== null) ? JSON.stringify(preview.after, null, 2) : t('intel.approval.afterUnavailable')} />
            </Grid>
          </Grid>
        )}
        {approval.result && (
          <>
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
              {t('intel.approval.result')}
            </Typography>
            <Code value={pretty(approval.result)} />
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
