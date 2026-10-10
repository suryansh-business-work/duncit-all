export interface JudgeCriterion {
  key: string;
  label: string;
  max: number;
}

/** Marks are typed as text (a numeric keyboard is a request, not a rule) and parsed on submit. */
export interface JudgeSheetValues {
  candidate_id: string;
  marks: Record<string, string>;
}

export interface CreateChallengeValues {
  template_id: string;
  name: string;
}

export interface RosterValues {
  competitors: { competitor_id: string; name: string; user_id: string }[];
}

export interface ReasonValues {
  reason: string;
}
