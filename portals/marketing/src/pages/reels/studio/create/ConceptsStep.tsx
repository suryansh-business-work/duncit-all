import { FormControl, FormControlLabel, FormLabel, Paper, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ReelConcept } from '../../types';

interface Props {
  concepts: readonly ReelConcept[];
  chosen: ReelConcept | null;
  busy: boolean;
  onPick: (concept: ReelConcept) => void;
  onMore: () => void;
  onContinue: () => void;
}

/** One idea, as a card: its title, the line it opens on, the angle it takes, and why it should work. */
function ConceptCard({ concept }: Readonly<{ concept: ReelConcept }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.5} sx={{ py: 0.5 }}>
      <Typography variant="subtitle2" component="span">
        {concept.title}
      </Typography>
      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
        {t('ai.reels.create.conceptHook', { vars: { hook: concept.hook } })}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('ai.reels.create.conceptAngle', { vars: { angle: concept.angle } })}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('ai.reels.create.conceptWhy', { vars: { why: concept.why } })}
      </Typography>
    </Stack>
  );
}

/** The concepts the writer offered, one to be picked — or more asked for. */
export default function ConceptsStep({ concepts, chosen, busy, onPick, onMore, onContinue }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5} data-testid="reel-concepts-step">
      <FormControl component="fieldset" sx={{ width: '100%' }}>
        <FormLabel component="legend">{t('ai.reels.create.conceptsLabel')}</FormLabel>
        <RadioGroup
          value={chosen?.id ?? ''}
          onChange={(_event, id) => {
            const concept = concepts.find((item) => item.id === id);
            if (concept) onPick(concept);
          }}
        >
          {concepts.map((concept) => (
            <Paper key={concept.id} variant="outlined" sx={{ px: 1.5, my: 0.5, borderRadius: 2, borderColor: chosen?.id === concept.id ? 'primary.main' : 'divider' }}>
              <FormControlLabel
                value={concept.id}
                control={<Radio size="small" />}
                label={<ConceptCard concept={concept} />}
                sx={{ alignItems: 'flex-start', width: '100%', m: 0 }}
                data-testid={`reel-concept-${concept.id}`}
              />
            </Paper>
          ))}
        </RadioGroup>
      </FormControl>
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
        <DuncitButton size="small" startIcon={<RefreshIcon />} disabled={busy} onClick={onMore} data-testid="reel-concepts-more">
          {t('ai.reels.create.moreIdeas')}
        </DuncitButton>
        <DuncitButton
          size="small"
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          disabled={chosen === null}
          loading={busy}
          onClick={onContinue}
          data-testid="reel-concepts-continue"
        >
          {t('ai.reels.create.writeScript')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
