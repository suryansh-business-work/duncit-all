import { Schema, Types, model, type InferSchemaType } from 'mongoose';
import { CRM_LEAD_ENTITY_TYPES, type CrmLeadEntityType } from '@modules/crm/crm/crm.constants';

/**
 * Logos & Images on a CRM lead (Lead Details › Logos & Images), for every lead
 * kind. One collection keyed by (entity_type, lead_id) rather than an array on
 * each of the five lead documents: a lead's form save can never overwrite an
 * upload made meanwhile, the lead documents stay small, and every kind gets
 * the feature from one place.
 */

export const CRM_LEAD_MEDIA_KINDS = ['LOGO', 'IMAGE'] as const;
export type CrmLeadMediaKind = (typeof CRM_LEAD_MEDIA_KINDS)[number];

const crmLeadMediaSchema = new Schema(
  {
    entity_type: { type: String, enum: CRM_LEAD_ENTITY_TYPES, required: true },
    lead_id: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: CRM_LEAD_MEDIA_KINDS, required: true },
    url: { type: String, required: true, trim: true },
    name: { type: String, trim: true, default: '' },
    mime_type: { type: String, trim: true, default: '' },
    size_bytes: { type: Number, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    sort_order: { type: Number, default: 0 },
    uploaded_by: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The one read: every item of one lead, logos then images, in their order.
crmLeadMediaSchema.index({ entity_type: 1, lead_id: 1, kind: 1, sort_order: 1 });

export type CrmLeadMediaDoc = InferSchemaType<typeof crmLeadMediaSchema> & { _id: unknown };
export const CrmLeadMediaModel = model('CrmLeadMedia', crmLeadMediaSchema);

/**
 * A deleted lead takes its logos and images with it. Lives beside the model
 * (not in the service) so the lead services can call it without importing the
 * media service, which itself reads the lead models.
 */
export async function removeLeadMedia(entity: CrmLeadEntityType, leadId: string): Promise<number> {
  if (!Types.ObjectId.isValid(leadId)) return 0;
  const res = await CrmLeadMediaModel.deleteMany({ entity_type: entity, lead_id: new Types.ObjectId(leadId) });
  return res.deletedCount;
}
