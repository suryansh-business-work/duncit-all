import { Schema, model, InferSchemaType, Types } from 'mongoose';

/**
 * Onboarding surveys: many surveys per `kind` (VENUE | HOST), each scoped to a
 * slot in the Super → Category → Sub taxonomy. `super_category_id` is the only
 * required scope field; `category_id` / `sub_category_id` are optional and act
 * as wildcards when null. A survey with all three null is the kind-level
 * default. The consuming flows (mWeb / mobile / CRM) resolve the *most specific*
 * matching survey for the user's chosen category — see `survey.service.activeFor`.
 *
 * Authored in the Onboarding portal and shown before a user registers a venue /
 * becomes a host. Responses are stored per user per survey and surfaced in the
 * Admin user-details page.
 */
export const SURVEY_KINDS = ['VENUE', 'HOST', 'ECOMM'] as const;
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
    kind: { type: String, enum: SURVEY_KINDS, required: true, index: true },
    // Taxonomy scope. super is required for category-specific surveys; legacy /
    // default surveys keep all three null. null = wildcard when matching.
    super_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    sub_category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    title: { type: String, default: '' },
    questions: { type: [questionSchema], default: [] },
    is_active: { type: Boolean, default: true },
    updated_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One survey per exact taxonomy slot per kind — editing replaces it; a second
// survey for the same slot would be ambiguous for most-specific matching.
surveySchema.index(
  { kind: 1, super_category_id: 1, category_id: 1, sub_category_id: 1 },
  { unique: true }
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
    survey_id: { type: Schema.Types.ObjectId, ref: 'Survey', required: true, index: true },
    kind: { type: String, enum: SURVEY_KINDS, required: true, index: true },
    answers: { type: [answerSchema], default: [] },
    submitted_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One response per user per survey — re-submitting upserts.
surveyResponseSchema.index({ user_id: 1, survey_id: 1 }, { unique: true });

export type SurveyDoc = InferSchemaType<typeof surveySchema> & { _id: Types.ObjectId };
export type SurveyResponseDoc = InferSchemaType<typeof surveyResponseSchema> & { _id: Types.ObjectId };
export const SurveyModel = model('Survey', surveySchema);
export const SurveyResponseModel = model('SurveyResponse', surveyResponseSchema);
