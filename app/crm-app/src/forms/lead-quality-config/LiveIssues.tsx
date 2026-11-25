import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import {
  LEAD_QUALITY_EDITOR,
  type QualityFormValues,
} from '@/features/lead-quality-settings/editor';
import { weightageTotal, type QualityIssue } from '@/generated/lead-quality-rules';

interface LiveCheck {
  /** The values as they are right now. */
  values: QualityFormValues;
  /** Every problem the publish rules find in them. */
  issues: QualityIssue[];
  /** The enabled criteria's weightage, in percent. */
  total: number;
}

const EMPTY: LiveCheck = {
  values: {
    criteria: [],
    qualify_on_gates: true,
    min_qualification_score: '',
    bands: [],
    change_note: '',
  },
  issues: [],
  total: 0,
};

const LiveIssuesContext = createContext<LiveCheck>(EMPTY);

/**
 * Runs the rules once per edit and shares the answer, so the total bar, each
 * criterion's sub-criteria total and the publish hint all read the same
 * result without each re-validating the whole model (as the portal does).
 */
export function LiveIssuesProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { control } = useFormContext<QualityFormValues>();
  const [criteria, qualifyOnGates, minScore, bands] = useWatch({
    control,
    name: ['criteria', 'qualify_on_gates', 'min_qualification_score', 'bands'],
  });
  const value = useMemo<LiveCheck>(() => {
    const values: QualityFormValues = {
      criteria,
      qualify_on_gates: qualifyOnGates,
      min_qualification_score: minScore,
      bands,
      change_note: '',
    };
    return {
      values,
      issues: LEAD_QUALITY_EDITOR.liveIssues(values, 'PUBLISH'),
      total: weightageTotal(LEAD_QUALITY_EDITOR.toBody(values).criteria),
    };
  }, [criteria, qualifyOnGates, minScore, bands]);
  return <LiveIssuesContext.Provider value={value}>{children}</LiveIssuesContext.Provider>;
}

export const useLiveIssues = (): LiveCheck => useContext(LiveIssuesContext);
