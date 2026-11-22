import { useId } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { DuncitButton } from '@duncit/buttons';
import { formatDateTime } from '@duncit/app-settings';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import type { LeadQualityDetails } from '../../api/leadQuality.gql';
import QualityScoreRing from '../lead-quality/QualityScoreRing';
import { QUALIFICATION_COLOR, QUALIFICATION_KEY, VERIFICATION_KEY, keyOr } from '../lead-quality/qualityLabels';
import type { LeadQualityActions, RecalcMode } from './useLeadQualityActions';
import { formatPoints } from './qualityFormat';
import QualityGates from './QualityGates';
import QualityNotices from './QualityNotices';

interface Props {
  details: LeadQualityDetails;
  actions: LeadQualityActions;
}

const SUBTLE = { color: 'text.secondary' } as const;

/** The score at a glance: the large ring, its classification, qualification, verification, gates and the recalculate actions. */
export default function QualitySummary({ details, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const { result } = details;
  const hintId = useId();
  const run = (mode: RecalcMode) => fireAndForget(actions.recalculate(mode), logs.portal.crm, 'LeadQualityTab', mode);
  const busy = actions.running !== null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ alignItems: { sm: 'center' } }}>
          <QualityScoreRing size="large" score={result?.score ?? null} tone={result?.tone} label={result?.classification_label} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }} data-testid="lead-quality-classification">
              {result ? result.classification_label : t('crm.leadQuality.notScored')}
            </Typography>
            {result && (
              <>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
                  <Chip
                    size="small"
                    color={QUALIFICATION_COLOR[result.qualification] ?? 'default'}
                    label={t(keyOr(QUALIFICATION_KEY, result.qualification, 'crm.leadQuality.pendingVerification'))}
                    data-testid="lead-quality-qualification"
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={t(keyOr(VERIFICATION_KEY, result.verification, 'crm.leadQuality.verificationPending'))}
                    data-testid="lead-quality-verification"
                  />
                </Stack>
                <Typography variant="body2" sx={{ ...SUBTLE, mt: 1 }}>
                  {t('crm.leadQualityTab.itemCounts', {
                    vars: { verified: result.verified_items, pending: result.pending_items, failed: result.failed_items },
                  })}
                </Typography>
                {result.potential_score > result.score && (
                  <Typography variant="body2" sx={SUBTLE}>
                    {t('crm.leadQualityTab.potentialScore', { vars: { score: formatPoints(result.potential_score) } })}
                  </Typography>
                )}
                <Typography variant="body2" sx={SUBTLE}>
                  {result.min_qualification_score == null
                    ? t('crm.leadQualityTab.qualifiesOnGates')
                    : t('crm.leadQualityTab.qualifiesAt', { vars: { score: formatPoints(result.min_qualification_score) } })}
                </Typography>
              </>
            )}
            {details.scored_at && (
              <Typography variant="caption" sx={SUBTLE}>
                {t('crm.leadQualityTab.scoredAt', {
                  vars: { date: formatDateTime(details.scored_at), version: details.scored_version ?? '—' },
                })}
              </Typography>
            )}
          </Box>
          <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <DuncitButton
              variant="contained"
              startIcon={<RefreshIcon />}
              loading={actions.running === 'recalculate'}
              disabled={busy}
              onClick={() => run('recalculate')}
              data-testid="lead-quality-recalculate"
            >
              {t('crm.leadQualityTab.recalculate')}
            </DuncitButton>
            <DuncitButton
              variant="outlined"
              startIcon={<FactCheckIcon />}
              loading={actions.running === 'reverify'}
              disabled={busy}
              onClick={() => run('reverify')}
              aria-describedby={hintId}
              data-testid="lead-quality-reverify"
            >
              {t('crm.leadQualityTab.reverify')}
            </DuncitButton>
            <Typography id={hintId} variant="caption" sx={{ ...SUBTLE, maxWidth: (theme) => theme.spacing(30) }}>
              {t('crm.leadQualityTab.reverifyHint')}
            </Typography>
          </Stack>
        </Stack>
        <QualityNotices details={details} skipped={actions.skipped} error={actions.error} />
        {result && <QualityGates gates={result.gates} />}
      </CardContent>
    </Card>
  );
}
