import { Schema } from 'mongoose';
import { AI_RECOMMENDATIONS, type AiRecommendation } from './failedPayment.types';

/**
 * The AI's short "refund or not" note on a case, kept on the case so opening
 * the page again costs nothing. `case_revision` is the case's revision when it
 * was written: once the case moves on (a review, a refund, a re-check) the note
 * is shown as out of date and Finance can ask for a fresh one.
 */
export interface ICaseAiSummary {
  /** '' when the last run failed and only `error` is set. */
  recommendation: AiRecommendation | '';
  summary: string;
  reasons: string[];
  case_revision: number;
  generated_at: Date | null;
  generated_by_name: string;
  /** Why the last run produced no note (AI switched off, an outage, an unreadable answer). */
  error: string;
}

export const aiSummarySchema = new Schema<ICaseAiSummary>(
  {
    recommendation: { type: String, enum: ['', ...AI_RECOMMENDATIONS], default: '' },
    summary: { type: String, default: '', maxlength: 1000 },
    reasons: { type: [String], default: [] },
    case_revision: { type: Number, default: 0 },
    generated_at: { type: Date, default: null },
    generated_by_name: { type: String, default: '' },
    error: { type: String, default: '', maxlength: 500 },
  },
  { _id: false }
);
