import { z } from 'zod';
import type { Translate } from '@duncit/shell';

/** Deleting a column names the column that receives its cases. */
export const deleteColumnSchema = (t: Translate) =>
  z.object({ target_column_id: z.string().min(1, t('testsManual.validation.targetRequired')) });

export type DeleteColumnValues = z.infer<ReturnType<typeof deleteColumnSchema>>;
