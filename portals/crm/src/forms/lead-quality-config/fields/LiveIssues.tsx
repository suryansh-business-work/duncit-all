import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { weightageTotal, type QualityIssue } from '../../../lib/generated/lead-quality-rules';
import { toConfigBody } from '../lead-quality-config.convert';
import { liveIssues } from '../lead-quality-config.issues';
import type { LeadQualityConfigFormValues } from '../lead-quality-config.schema';

interface LiveCheck {
  /** The values as they are right now. */
  values: LeadQualityConfigFormValues;
  /** Every problem the publish rules find in them. */
  issues: QualityIssue[];
  /** The enabled criteria's weightage, in percent. */
  total: number;
}

const LiveIssuesContext = createContext<LiveCheck | null>(null);

/**
 * Runs the generated rules once per edit and shares the result, so the total
 * bar, each criterion's sub-criteria total and the publish hint all read the
 * same answer without each re-validating the whole model.
 */
export function LiveIssuesProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { control } = useFormContext<LeadQualityConfigFormValues>();
  const [criteria, qualifyOnGates, minScore, bands] = useWatch({
    control,
    name: ['criteria', 'qualify_on_gates', 'min_qualification_score', 'bands'],
  });
  const value = useMemo<LiveCheck>(() => {
    const values: LeadQualityConfigFormValues = {
      criteria,
      qualify_on_gates: qualifyOnGates,
      min_qualification_score: minScore,
      bands,
      change_note: '',
    };
    return { values, issues: liveIssues(values), total: weightageTotal(toConfigBody(values).criteria) };
  }, [criteria, qualifyOnGates, minScore, bands]);
  return <LiveIssuesContext.Provider value={value}>{children}</LiveIssuesContext.Provider>;
}

export function useLiveIssues(): LiveCheck {
  const value = useContext(LiveIssuesContext);
  if (!value) throw new Error('useLiveIssues needs a LiveIssuesProvider above it.');
  return value;
}
