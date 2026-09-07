import { Schema, model, Types, type Document } from 'mongoose';
import { nextEntityNo } from '@modules/venues/entityIdCounter';

/**
 * A Regional Club Admin's patch: the Club Admins who report into them.
 *
 * The ONLY thing stored is that list. Cities, localities, hosts and pods are
 * every level of the tree BELOW a club admin, and all of them already exist as
 * facts about clubs and pods — a region that also stored its own cities would
 * be a second copy of "which city is this club in", and the two would disagree
 * the first time a club moved.
 *
 * There is no onboarding record and no application: the role is granted from
 * the Admin portal, and the region row is created the first time its holder
 * opens the console. That is deliberate — a Regional Club Admin is an internal
 * appointment, not a partner who applies.
 */
export interface IRegion extends Document {
  /** Narrowed from Document's `unknown`: every read of this doc stringifies it. */
  _id: Types.ObjectId;
  /** Permanent human id (RGN-000001) — never reused. */
  region_no: string | null;
  /** The Regional Club Admin. One region per person, which is what makes the
   * console's "my region" read unambiguous. */
  manager_user_id: Types.ObjectId;
  region_name: string;
  /** The Club Admins in this region. Everything under them is derived. */
  club_admin_user_ids: Types.ObjectId[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const regionSchema = new Schema<IRegion>(
  {
    region_no: { type: String, default: null, index: true },
    manager_user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    region_name: { type: String, default: '', trim: true, maxlength: 160 },
    club_admin_user_ids: { type: [Schema.Types.ObjectId], ref: 'User', default: [], index: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

regionSchema.pre('save', async function assignRegionNo(next) {
  if (this.isNew && !this.region_no) {
    this.region_no = await nextEntityNo('RGN', 'region');
  }
  next();
});

export const RegionModel = model<IRegion>('Region', regionSchema);
