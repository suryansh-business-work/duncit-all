import { Chip } from '@mui/material';
import { STAGE_COLOR, STAGE_LABEL_KEY } from './helpers';
import type { AutoPodTableRow } from './queries';

interface StageChipProps {
  row: AutoPodTableRow;
  t: (key: string) => string;
}

/** Where the offer sits in its enrolment cycle, in one chip. The row's
 * actions live in `AutoPodRowMenu`. */
export function AutoPodStageChip({ row, t }: Readonly<StageChipProps>) {
  return <Chip size="small" color={STAGE_COLOR[row.stage]} label={t(STAGE_LABEL_KEY[row.stage])} />;
}
