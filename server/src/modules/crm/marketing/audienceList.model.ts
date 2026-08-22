import { Schema, model, InferSchemaType, type Types } from 'mongoose';

/**
 * A saved Target Audience list.
 *
 * It stores the FILTER CRITERIA, not the people — a live segment. Opening the
 * list re-runs the filters, so somebody who signs up tomorrow and matches is in
 * it tomorrow, and the member count is always current rather than a number that
 * was true the day the list was built.
 *
 * `manual_user_ids` is the one exception: people added to the list by hand,
 * unioned with whoever the criteria match. It is a union and not a snapshot, so
 * a list can be a segment, a hand-picked set, or both at once.
 */
const audienceFilterSchema = new Schema(
  {
    field: { type: String, required: true },
    op: { type: String, required: true },
    value: { type: String, default: null },
    values: { type: [String], default: [] },
  },
  { _id: false }
);

const audienceListSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    /** Who owns this list — a person's name, not an account. Free text so a
     * list can be assigned to someone who has no portal login. */
    owner: { type: String, required: true, trim: true, maxlength: 120 },
    /** The account behind `owner`, when it was picked from the portal-access
     * list. Null for a list imported or created before the picker existed. */
    owner_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    /** The saved criteria, in the shared table-filter shape. */
    filters: { type: [audienceFilterSchema], default: [] },
    /** The free-text search that was active alongside the filters. */
    search: { type: String, default: '', trim: true, maxlength: 200 },
    /** People added to this list by hand, on top of whoever the criteria match. */
    manual_user_ids: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    /** The signed-in user who created it (audit; `owner` is editable copy). */
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

audienceListSchema.index({ name: 1 });
audienceListSchema.index({ created_at: -1 });

export type AudienceListDoc = InferSchemaType<typeof audienceListSchema> & { _id: Types.ObjectId };
export const AudienceListModel = model('AudienceList', audienceListSchema);
