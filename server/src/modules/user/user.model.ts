import { Schema, model, InferSchemaType } from 'mongoose';
import { STATUSES } from './user.constants';

const petProfileSchema = new Schema(
  {
    name: { type: String, trim: true },
    species: { type: String, trim: true },
    breed: { type: String, trim: true },
    age: { type: Number, min: 0 },
    photo_url: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const profileLinkSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 40 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },

    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    is_email_verified: { type: Boolean, default: false },

    phone_number: { type: String, required: true, trim: true },
    phone_extension: { type: String, required: true, trim: true },
    is_phone_verified: { type: Boolean, default: false },

    password: { type: String, select: false },

    google_id: { type: String, unique: true, sparse: true, index: true },

    last_login_provider: { type: String, enum: ['EMAIL', 'GOOGLE'], default: null },
    last_login_at: { type: Date, default: null },

    dob: { type: Date, required: true },

    country: { type: String, default: 'India' },
    city: String,
    zone: String,

    roles: {
      type: [String],
      required: true,
      default: ['USER'],
    },

    assigned_city: String,
    assigned_zones: { type: [String], default: [] },

    profile_photo: String,
    bio: String,
    profile_links: { type: [profileLinkSchema], default: [] },

    pet_profile: { type: petProfileSchema, default: null },

    saved_pod_ids: [{ type: Schema.Types.ObjectId, ref: 'Pod' }],
    following_user_ids: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    follower_user_ids: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    interest_category_ids: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    onboarding_survey_completed: { type: Boolean, default: false },

    is_first_time_user: { type: Boolean, default: true },

    status: {
      type: String,
      enum: STATUSES,
      default: 'ACTIVE',
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

userSchema.index({ phone_number: 1, phone_extension: 1 }, { unique: true });
userSchema.index({ saved_pod_ids: 1 });
userSchema.index({ following_user_ids: 1 });
userSchema.index({ interest_category_ids: 1 });

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: any };
export const UserModel = model('User', userSchema);
