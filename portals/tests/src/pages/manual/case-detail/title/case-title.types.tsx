import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { titleRule } from '../../shared/caseRules';

export const caseTitleSchema = (t: Translate) => z.object({ title: titleRule(t) });

export type CaseTitleValues = z.infer<ReturnType<typeof caseTitleSchema>>;
