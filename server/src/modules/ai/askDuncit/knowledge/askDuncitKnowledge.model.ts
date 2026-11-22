import { Schema, model, type Types } from 'mongoose';
import { ASK_DUNCIT_ROLE_KEYS } from '../askDuncit.constants';

/**
 * The Ask Duncit knowledge base: articles and SOPs operators write in the AI
 * portal. Only PUBLISHED articles reach the assistant, and only for the roles
 * in `audience_roles` (empty = every role) — an internal SOP for staff is never
 * retrieved into a member's conversation.
 */

export const KNOWLEDGE_KINDS = ['ARTICLE', 'SOP', 'FAQ', 'POLICY'] as const;
export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number];

export const KNOWLEDGE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

export interface IAskDuncitKnowledge {
  _id: Types.ObjectId;
  title: string;
  body: string;
  kind: KnowledgeKind;
  audience_roles: string[];
  tags: string[];
  locale: string;
  status: KnowledgeStatus;
  version: number;
  hits: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const knowledgeSchema = new Schema<IAskDuncitKnowledge>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    kind: { type: String, enum: KNOWLEDGE_KINDS, default: 'ARTICLE' },
    audience_roles: { type: [{ type: String, enum: ASK_DUNCIT_ROLE_KEYS }], default: [] },
    tags: { type: [String], default: [] },
    locale: { type: String, default: '' },
    status: { type: String, enum: KNOWLEDGE_STATUSES, default: 'DRAFT' },
    version: { type: Number, default: 1 },
    hits: { type: Number, default: 0 },
    created_by: { type: String, default: null },
    updated_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

knowledgeSchema.index({ title: 'text', body: 'text', tags: 'text' }, { weights: { title: 8, tags: 4, body: 1 } });
knowledgeSchema.index({ status: 1, updated_at: -1 });

export const AskDuncitKnowledgeModel = model<IAskDuncitKnowledge>('AskDuncitKnowledge', knowledgeSchema);
