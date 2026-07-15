import { create } from 'zustand';

import type { ActiveSurvey, SurveyKind } from '@/graphql/onboarding-survey';
import type {
  Answer,
  CategoryLabels,
  Phase,
  Scope,
} from '@/components/survey-onboarding/useOnboardingFlow';

/** The in-progress Earn onboarding draft — category scope + survey answers +
 *  which step the user reached — so pressing Back and returning restores it. */
export interface OnboardingDraft {
  phase: Phase;
  scope: Scope;
  labels?: CategoryLabels;
  survey: ActiveSurvey | null;
  answers: Record<string, Answer>;
}

interface DraftState {
  drafts: Partial<Record<SurveyKind, OnboardingDraft>>;
  getDraft: (kind: SurveyKind) => OnboardingDraft | undefined;
  setDraft: (kind: SurveyKind, draft: OnboardingDraft) => void;
  clearDraft: (kind: SurveyKind) => void;
}

/** Per-kind (host / venue / ecomm) draft cache for the Earn onboarding flow.
 *  Kept in memory (not persisted to storage) — it just needs to outlive the
 *  survey screen unmounting on a Back navigation. */
export const useOnboardingDraftStore = create<DraftState>((set, get) => ({
  drafts: {},
  getDraft: (kind) => get().drafts[kind],
  setDraft: (kind, draft) => set((s) => ({ drafts: { ...s.drafts, [kind]: draft } })),
  clearDraft: (kind) =>
    set((s) => {
      const next = { ...s.drafts };
      delete next[kind];
      return { drafts: next };
    }),
}));
