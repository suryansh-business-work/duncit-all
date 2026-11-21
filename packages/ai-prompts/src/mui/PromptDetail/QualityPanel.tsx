import { Alert, Box, CircularProgress, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat } from '@duncit/app-settings';
import type { PromptQuality } from '../../detailTypes';
import { useDetailCopy } from '../../i18n/useDetailCopy';

interface Props {
  quality: PromptQuality | null;
  scoring: boolean;
  error: string | null;
  onRescore: () => void;
}

type Band = 'strong' | 'fair' | 'weak';

/** Where a score sits. The thresholds are the rubric's own reading of "good enough". */
export const qualityBand = (score: number): Band => {
  if (score >= 80) return 'strong';
  if (score >= 50) return 'fair';
  return 'weak';
};

const BAND_COLOR: Record<Band, 'success' | 'warning' | 'error'> = { strong: 'success', fair: 'warning', weak: 'error' };

function ReasonList({ title, items }: Readonly<{ title: string; items: string[] }>) {
  if (items.length === 0) return null;
  return (
    <Box>
      <Typography variant="subtitle2" component="h3">
        {title}
      </Typography>
      <List dense disablePadding>
        {items.map((item) => (
          <ListItem key={item} disableGutters>
            <ListItemText primary={item} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

/** ChatGPT's review of the prompt: a score out of 100, why, and what to change. */
export function QualityPanel({ quality, scoring, error, onRescore }: Readonly<Props>) {
  const copy = useDetailCopy();
  const { formatDateTime } = useDateFormat();
  const band = quality ? qualityBand(quality.score) : null;

  return (
    <Stack spacing={2} aria-busy={scoring}>
      {error && <Alert severity="error">{error}</Alert>}
      {scoring && (
        <Stack direction="row" spacing={1} role="status" sx={{ alignItems: 'center' }}>
          <CircularProgress size={18} />
          <Typography variant="body2">{copy.quality.scoring}</Typography>
        </Stack>
      )}
      {!quality && !scoring && !error && <Typography variant="body2">{copy.quality.none}</Typography>}
      {quality && band && (
        <>
          {quality.stale && <Alert severity="warning">{copy.quality.stale}</Alert>}
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress
                variant="determinate"
                value={quality.score}
                size={72}
                thickness={5}
                color={BAND_COLOR[band]}
                aria-label={copy.quality.scoreAria(quality.score)}
              />
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h6" component="span" sx={{ fontWeight: 800 }}>
                  {quality.score}
                </Typography>
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {copy.quality.bands[band]}
              </Typography>
              <Typography variant="body2">{quality.summary}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {copy.quality.scoredBy(quality.model, formatDateTime(quality.scored_at))}
              </Typography>
            </Box>
          </Stack>
          <ReasonList title={copy.quality.strengths} items={quality.strengths} />
          <ReasonList title={copy.quality.improvements} items={quality.improvements} />
        </>
      )}
      <Box>
        <DuncitButton size="small" startIcon={<AutorenewIcon />} disabled={scoring} onClick={onRescore}>
          {copy.quality.rescore}
        </DuncitButton>
      </Box>
    </Stack>
  );
}
