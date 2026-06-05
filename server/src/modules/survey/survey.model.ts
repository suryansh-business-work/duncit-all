import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * Onboarding surveys: one survey per `kind` (VENUE | HOST), authored in the
 * Onboarding portal and shown before a user registers a venue / becomes a host
 * in mWeb + mobile. Responses are stored per user (one per kind) and surfaced
 * in the Admin user-details page.
 */
export const SURVEY_KINDS = ['VENUE', 'HOST'] as const;
export const QUESTION_TYPES = ['SECTION', 'MCQ', 'TEXT', 'TEXTAREA'] as const;
export type SurveyKind = (typeof SURVEY_KINDS)[number];
export type QuestionType = (typeof QUESTION_TYPES)[number];

const questionSchema = new Schema(
  {
    qid: { type: String, required: true },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    label: { type: String, required: true, trim: true },
    help: { type: String, default: null },
    required: { type: Boolean, default: false },
    multi: { type: Boolean, default: false }, // MCQ: allow multiple selections
    options: { type: [String], default: [] }, // MCQ choices
    sort_order: { type: Number, default: 0 },
  },
  { _id: false }
);

const surveySchema = new Schema(
  {
    kind: { type: String, enum: SURVEY_KINDS, required: true, unique: true, index: true },
    title: { type: String, default: '' },
    questions: { type: [questionSchema], default: [] },
    is_active: { type: Boolean, default: true },
    updated_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const answerSchema = new Schema(
  {
    qid: { type: String, required: true },
    value: { type: String, default: null }, // TEXT / TEXTAREA / single MCQ
    values: { type: [String], default: [] }, // multi MCQ
  },
  { _id: false }
);

const surveyResponseSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: SURVEY_KINDS, required: true, index: true },
    answers: { type: [answerSchema], default: [] },
    submitted_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One response per user per kind — re-submitting upserts.
surveyResponseSchema.index({ user_id: 1, kind: 1 }, { unique: true });

export type SurveyDoc = InferSchemaType<typeof surveySchema> & { _id: Types.ObjectId };
export type SurveyResponseDoc = InferSchemaType<typeof surveyResponseSchema> & { _id: Types.ObjectId };
export const SurveyModel = model('Survey', surveySchema);
export const SurveyResponseModel = model('SurveyResponse', surveyResponseSchema);
