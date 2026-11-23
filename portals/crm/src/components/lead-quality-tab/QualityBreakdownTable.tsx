import { Card, Chip, Table, TableBody, TableCell, TableContainer, TableFooter, TableHead, TableRow } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { toneOf } from '../lead-quality/QualityScoreRing';
import { formatPoints } from './qualityFormat';
import CriterionRow from './CriterionRow';
import type { QualityEvidence, QualityItemResult, QualityResult } from './qualityTypes';

interface Props {
  result: QualityResult;
  evidence: ReadonlyMap<string, QualityEvidence>;
  onRecord: (item: QualityItemResult) => void;
}

const TOTAL_SX = { typography: 'body2', fontWeight: 700, color: 'text.primary' } as const;

/**
 * Quality criteria | Maximum | Earned | Status, one expandable row per
 * criterion and a Total row (the maximum, the score, the classification) —
 * all read from the same result as the ring above it.
 */
export default function QualityBreakdownTable({ result, evidence, onRecord }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined">
      <TableContainer>
        <Table size="small" aria-label={t('crm.leadQualityTab.tableLabel')} data-testid="lead-quality-breakdown">
          <TableHead>
            <TableRow>
              <TableCell>{t('crm.leadQualityTab.colCriteria')}</TableCell>
              <TableCell align="right">{t('crm.leadQualityTab.colMaximum')}</TableCell>
              <TableCell align="right">{t('crm.leadQualityTab.colEarned')}</TableCell>
              <TableCell>{t('shell.common.status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result.criteria.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} sx={{ color: 'text.secondary' }}>
                  {t('crm.leadQualityTab.noCriteria')}
                </TableCell>
              </TableRow>
            ) : (
              result.criteria.map((criterion) => (
                <CriterionRow key={criterion.key} criterion={criterion} evidence={evidence} onRecord={onRecord} />
              ))
            )}
          </TableBody>
          <TableFooter>
            <TableRow data-testid="lead-quality-total">
              <TableCell component="th" scope="row" sx={TOTAL_SX}>
                {t('crm.leadQualityTab.total')}
              </TableCell>
              <TableCell align="right" sx={TOTAL_SX}>
                {formatPoints(result.max_score)}
              </TableCell>
              <TableCell align="right" sx={TOTAL_SX}>
                {formatPoints(result.score)}
              </TableCell>
              <TableCell sx={TOTAL_SX}>
                <Chip size="small" color={toneOf(result.tone)} label={result.classification_label} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Card>
  );
}
