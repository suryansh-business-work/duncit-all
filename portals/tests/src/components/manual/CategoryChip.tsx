import type { ManualTestCategory } from '@duncit/gql-types';
import { StatusChip } from '@duncit/ui';
import { CATEGORY_TONES } from '../../pages/manual/shared/vocabulary';

interface Props {
  category: ManualTestCategory;
  /** The column's own name; its category decides only the tone. */
  label: string;
}

/** A column (a case's status) as a chip toned by what the column means. */
export function CategoryChip({ category, label }: Readonly<Props>) {
  return <StatusChip status={category} colorMap={CATEGORY_TONES} label={label} variant="outlined" />;
}
